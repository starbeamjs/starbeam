import {
  type DebugFilter,
  type DebugListener,
  type Description,
  callerStack,
  DebugTimeline,
  // eslint-disable-next-line unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars
  ifDebug,
  isDebug,
  LOGGER,
  Stack,
} from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";
import { expected, isEqual, verify } from "@starbeam/verify";

import { LIFETIME } from "../lifetime/api.js";
import { type FinalizedFrame, ActiveFrame } from "./frames.js";
import { NOW } from "./now.js";
// eslint-disable-next-line import/no-cycle
import { Pollable } from "./pollables/pollable.js";
// eslint-disable-next-line import/no-cycle
import { Pollables } from "./pollables/pollables.js";
import { Queue } from "./queue.js";
import type {
  MutableInternals,
  Reactive,
  ReactiveInternals,
  ReactiveProtocol,
} from "./reactive.js";
import { Timestamp } from "./timestamp.js";

export abstract class Phase {
  abstract bump(internals: MutableInternals): void;
  abstract consume(internals: ReactiveInternals): void;
}

export class ActionsPhase extends Phase {
  static create(): ActionsPhase {
    return new ActionsPhase(new Set());
  }

  readonly #bumped: Set<MutableInternals>;

  private constructor(bumped: Set<MutableInternals>) {
    super();
    this.#bumped = bumped;
  }

  bump(internals: MutableInternals): void {
    this.#bumped.add(internals);
  }

  consume(_internals: MutableInternals): void {
    // do nothing
  }
}

export class RenderPhase extends Phase {
  static create(): RenderPhase {
    return new RenderPhase(new Set());
  }

  readonly #consumed: Set<ReactiveInternals>;

  private constructor(consumed: Set<ReactiveInternals>) {
    super();
    this.#consumed = consumed;
  }

  bump(internals: MutableInternals): void {
    throw Error(
      `You cannot mutate a data cell during the Render phase. You attempted to mutate ${internals.description.describe()}`
    );
  }

  consume(internals: MutableInternals): void {
    this.#consumed.add(internals);
  }
}

export interface FormulaResult<T> {
  readonly frame: FinalizedFrame<T>;
  readonly value: T;
}

export interface StartedFormula {
  done(): FormulaResult<void>;
  done<T>(value: T): FormulaResult<T>;

  finally(): void;
}

export class Timeline {
  static create(): Timeline {
    return new Timeline(
      ActionsPhase.create(),
      Pollables.create(),
      new Map(),
      new Set()
    );
  }

  static StartedFormula = class StartedFormula {
    static create(description: Description, caller?: Stack): StartedFormula {
      const prevFrame = TIMELINE.#frame;

      const currentFrame = (TIMELINE.#frame = ActiveFrame.create(description));

      return new StartedFormula(prevFrame, currentFrame, caller);
    }

    #prev: ActiveFrame | null;
    #current: ActiveFrame;
    #caller?: Stack;

    private constructor(
      prev: ActiveFrame | null,
      current: ActiveFrame,
      caller?: Stack
    ) {
      this.#prev = prev;
      this.#current = current;
      this.#caller = caller;
    }

    done<T>(value: T): FormulaResult<T>;
    done(): FormulaResult<void>;
    done(value?: unknown): FormulaResult<unknown> {
      verify(
        TIMELINE.#frame,
        isEqual(this.#current),
        expected
          .as("the current frame")
          .when("ending a formula")
          .toBe(`the same as the frame that started the formula`)
      );

      const newFrame = this.#current.finalize(value, NOW.now);
      TIMELINE.#frame = this.#prev;
      TIMELINE.didConsume(newFrame.frame, this.#caller);
      return newFrame;
    }

    finally(): void {
      TIMELINE.#frame = this.#prev;
    }
  };

  #phase: Phase;
  #callerStack: Stack | null = null;
  #frame: ActiveFrame | null = null;
  #debugTimeline: DebugTimeline | null = null;

  readonly #pollables: Pollables;
  readonly #onUpdate: WeakMap<MutableInternals, Set<() => void>>;
  readonly #afterRender: Set<() => void>;

  private constructor(
    phase: RenderPhase | ActionsPhase,
    renderables: Pollables,
    updaters: WeakMap<MutableInternals, Set<() => void>>,
    onAdvance: Set<() => void>
  ) {
    this.#phase = phase;
    this.#pollables = renderables;
    this.#onUpdate = updaters;
    this.#afterRender = onAdvance;
  }

  /**
   * Render a reactive value using the specified `render` function.
   *
   * A `render` function will run **after** all pending actions have flushed.
   */
  render<T>(input: Reactive<T>, render: () => void): Pollable {
    const ready = () => {
      if (this.#pollables.isRemoved(pollable)) {
        return;
      }

      return Queue.enqueueRender(render);
    };

    const pollable = Pollable.create(input, { ready }, this.#pollables);
    this.#pollables.insert(pollable);

    // renderable.poll();
    return pollable;
  }

  on = {
    rendered: (callback: () => void): (() => void) => {
      this.#afterRender.add(callback);

      return () => {
        this.#afterRender.delete(callback);
      };
    },

    change: (
      input: ReactiveProtocol,
      ready: (pollable: Pollable) => void
    ): Pollable => {
      const pollable = Pollable.create(input, { ready }, this.#pollables);
      this.#pollables.insert(pollable);

      return pollable;
    },
  } as const;

  /**
   * Dynamic assertions that are used in development mode to detect reads that occur outside of a
   * tracking frame, but which are used to produce rendered outputs.
   */
  #readAssertions = new Set<
    (reactive: ReactiveProtocol, caller: Stack) => void
  >();

  @ifDebug
  attach(
    notify: () => void,
    options: { filter: DebugFilter } = { filter: { type: "all" } }
  ): DebugListener {
    const listener = this.#debug.attach(notify, options);

    LIFETIME.on.cleanup(listener, () => listener.detach());

    return listener;
  }

  get #debug() {
    if (!this.#debugTimeline) {
      const debugTimeline = (this.#debugTimeline = DebugTimeline.create(
        Timestamp.zero()
      ));
      TIMELINE.on.rendered(() => debugTimeline.notify());
    }

    return this.#debugTimeline;
  }

  /**
   * When a reactive's dependencies might have changed, any renderables that depend on this reactive
   * need to refresh their dependencies. If there are no renderers for this reactive value,
   * {@linkcode TIMELINE.update} does nothing.
   *
   * Otherwise, each relevant renderable will unsubscribe from any stale dependencies and subscribe
   * to any new dependencies.
   *
   * For example, Formulas call this method after recomputing their value, which results in a
   * possible change to their dependencies.
   */
  update(reactive: ReactiveProtocol): void {
    this.#pollables.update(reactive);
  }

  prune(pollable: Pollable): void {
    this.#pollables.prune(pollable);
  }

  #updatersFor(storage: MutableInternals): Set<() => void> {
    let callbacks = this.#onUpdate.get(storage);

    if (!callbacks) {
      callbacks = new Set();
      this.#onUpdate.set(storage, callbacks);
    }

    return callbacks;
  }

  // Returns the current timestamp
  get now(): Timestamp {
    return NOW.now;
  }

  // Increment the current timestamp and return the incremented timestamp.
  bump(mutable: MutableInternals): Timestamp {
    this.#phase.bump(mutable);

    if (isDebug()) {
      this.#debug.updateCell(mutable);
    }

    NOW.bump();

    if (this.#afterRender.size > 0) {
      this.enqueueAfterRender(...this.#afterRender);
    }

    this.#notifySubscribers(mutable);
    this.#pollables.bumped(mutable);

    return NOW.now;
  }

  entryPoint<T>(callback: () => T): T {
    // the outermost entry point wins.
    if (isDebug() && !this.#callerStack) {
      try {
        this.#callerStack = callerStack(1);
        return callback();
      } finally {
        this.#callerStack = null;
      }
    } else {
      return callback();
    }
  }

  mutation<T>(description: string, callback: () => T): T {
    if (isDebug()) {
      return this.#debug.mutation(description, callback);
    }

    return callback();
  }

  /**
   * Enqueue an _action_ to be executed asynchronously.
   *
   * Actions are allowed to read **and** mutate reactive state. In general, actions should occur
   * **before** the next render, which will convert any changes to reactive state into outputs.
   */
  enqueueAction(...notifications: (() => void)[]): void {
    Queue.enqueueAction(...notifications);
  }

  /**
   * Enqueue a _render_ to be executed asynchronously.
   *
   * Renders are allowed to **read** reactive state, but **must not** mutate it. All renders take
   * place together, after enqueued actions have executed.
   *
   * Since renders cannot mutate reactive state, the order in which renders run cannot affect the
   * reactive values that other renders read.
   */
  enqueueRender(...callbacks: (() => void)[]): void {
    Queue.enqueueRender(...callbacks);
  }

  enqueueAfterRender(...callbacks: (() => void)[]): void {
    Queue.enqueueAfterRender(...callbacks);
  }

  /**
   * The `nextIdle` promise resolves the next time the queue is empty.
   */
  nextIdle(): Promise<void> {
    return Queue.idle();
  }

  #enqueue(...notifications: (() => void)[]): void {
    Queue.enqueueAction(...notifications);
  }

  #notifySubscribers(...storages: MutableInternals[]) {
    for (const storage of storages) {
      const updaters = this.#updatersFor(storage);

      if (isDebug()) {
        LOGGER.trace.log(
          `notifying listeners for cell\ncell: %o\nlisteners:%o`,
          storage,
          updaters
        );
      }

      if (updaters.size > 0) {
        this.#enqueue(...updaters);
      }
    }
  }

  // Indicate that a particular cell was used inside of the current computation.
  didConsume(reactive: ReactiveProtocol, caller?: Stack): void {
    this.#phase.consume(reactive[REACTIVE]);

    if (this.#frame) {
      this.#frame.add(reactive);
      return;
    }

    if (isDebug()) {
      // we don't add a consumption to the debug timeline if we're in a frame, because the frame
      // itself gets consumed
      this.#debug.consume(reactive);

      // if we're consuming a cell, but we're not in the context of a tracking frame, give read
      // barriers a chance to assert.
      if (reactive[REACTIVE].type === "mutable") {
        this.#untrackedRead(reactive, this.#callerStack ?? caller);
      }
    }
  }

  /**
   * In debug mode, register a barrier for untracked reads. This allows you to throw an error if an
   * untracked read occurred in a context (such as a render function) that a renderer knows will
   * produce rendered content.
   */
  @ifDebug
  untrackedReadBarrier(
    assertion: (reactive: ReactiveProtocol, caller: Stack) => void
  ): void {
    this.#readAssertions.add(assertion);
  }

  #untrackedRead(reactive: ReactiveProtocol, caller?: Stack) {
    for (const read of this.#readAssertions) {
      read(reactive, caller ?? Stack.EMPTY);
    }
  }

  /**
   * Run a formula in the context of a lifetime, and return a
   * {@link FinalizedFrame}.
   *
   * If the formula is re-evaluated, it will be re-evaluated in the context of
   * the same lifetime. You can think of a Starbeam Formula as a function that
   * closes over the "current lifetime" as well as the normal JavaScript
   * environment.
   */
  evaluateFormula<T>(
    callback: () => T,
    description: Description,
    caller?: Stack
  ): { readonly frame: FinalizedFrame<T>; readonly value: T } {
    const formula = Timeline.StartedFormula.create(description, caller);

    try {
      const result = callback();
      return formula.done(result);
    } catch (e) {
      formula.finally();
      throw e;
    }
  }

  startFormula(description: Description): StartedFormula {
    return Timeline.StartedFormula.create(description);
  }
}

export const TIMELINE = Timeline.create();
