import type { DescriptionArgs } from "@starbeam/debug";
import { LOGGER, Stack } from "@starbeam/debug";
import { expected, isEqual, verify } from "@starbeam/verify";

import {
  type DebugFilter,
  type DebugListener,
  DebugTimeline,
  isDebug,
} from "./debug.js";
import { type FinalizedFrame, ActiveFrame, AssertFrame } from "./frames.js";
import { NOW } from "./now.js";
import { Queue } from "./queue.js";
import type {
  MutableInternals,
  Reactive,
  ReactiveProtocol,
} from "./reactive.js";
import {
  type RenderableOperations,
  Renderable,
} from "./renderables/renderable.js";
import { Renderables } from "./renderables/renderables.js";
import { Timestamp } from "./timestamp.js";

export abstract class Phase {
  abstract bump(internals: MutableInternals): void;
}

export class ActionsPhase extends Phase {
  static create(description: string): ActionsPhase {
    return new ActionsPhase(description, new Set());
  }

  readonly #description: string;
  readonly #bumped: Set<MutableInternals>;

  private constructor(description: string, bumped: Set<MutableInternals>) {
    super();
    this.#description = description;
    this.#bumped = bumped;
  }

  bump(internals: MutableInternals) {
    this.#bumped.add(internals);
  }
}

export class RenderPhase extends Phase {
  static create(description: string): RenderPhase {
    return new RenderPhase(new Set(), description);
  }

  readonly #consumed: Set<ReactiveProtocol>;
  readonly #description: string;

  private constructor(consumed: Set<ReactiveProtocol>, description: string) {
    super();
    this.#consumed = consumed;
    this.#description = description;
  }

  bump(internals: MutableInternals): void {
    throw Error(
      `You cannot mutate a data cell during the Render phase. You attempted to mutate ${internals.description.describe()}`
    );
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

export class Timeline implements RenderableOperations {
  static create(): Timeline {
    return new Timeline(
      ActionsPhase.create("initialization"),
      Renderables.create(),
      new Map(),
      new Set()
    );
  }

  static StartedFormula = class StartedFormula {
    static create(description: DescriptionArgs): StartedFormula {
      const prevFrame = TIMELINE.#frame;

      const currentFrame = (TIMELINE.#frame = ActiveFrame.create(description));

      return new StartedFormula(prevFrame, currentFrame);
    }

    #prev: ActiveFrame | null;
    #current: ActiveFrame;

    private constructor(prev: ActiveFrame | null, current: ActiveFrame) {
      this.#prev = prev;
      this.#current = current;
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
      TIMELINE.didConsume(newFrame.frame);
      return newFrame;
    }

    finally() {
      TIMELINE.#frame = this.#prev;
    }
  };

  #phase: Phase;
  #frame: ActiveFrame | null = null;
  #assertFrame: AssertFrame | null = null;
  #debugTimeline: DebugTimeline | null = null;

  readonly #renderables: Renderables;
  readonly #onUpdate: WeakMap<MutableInternals, Set<() => void>>;
  readonly #onAdvance: Set<() => void>;

  private constructor(
    phase: RenderPhase | ActionsPhase,
    renderables: Renderables,
    updaters: WeakMap<MutableInternals, Set<() => void>>,
    onAdvance: Set<() => void>
  ) {
    this.#phase = phase;
    this.#renderables = renderables;
    this.#onUpdate = updaters;
    this.#onAdvance = onAdvance;
  }

  on = {
    rendered: (callback: () => void): (() => void) => {
      this.#onAdvance.add(callback);

      return () => {
        this.#onAdvance.delete(callback);
      };
    },

    change: <T>(
      input: Reactive<T>,
      ready: (renderable: Renderable<T>) => void,
      description?: string | DescriptionArgs
    ): Renderable<T> => {
      const renderable = Renderable.create(
        input,
        { ready },
        this,
        Stack.description(description)
      );
      this.#renderables.insert(renderable as Renderable<unknown>);

      return renderable;
    },
  } as const;

  attach(
    notify: () => void,
    options: { filter: DebugFilter } = { filter: { type: "all" } }
  ): DebugListener {
    return this.#debug.attach(notify, options);
  }

  get #debug() {
    if (!this.#debugTimeline) {
      const debugTimeline = (this.#debugTimeline = DebugTimeline.create(
        Timestamp.initial()
      ));
      TIMELINE.on.rendered(() => debugTimeline.notify());
    }

    return this.#debugTimeline;
  }

  poll<T>(renderable: Renderable<T>): T {
    return this.#renderables.poll(renderable);
  }

  render<T>(renderable: Renderable<T>, changed: (next: T, prev: T) => void) {
    this.#renderables.render(
      renderable,
      changed as (next: unknown, prev: unknown) => void
    );
  }

  prune(renderable: Renderable<unknown>): void {
    this.#renderables.prune(renderable);
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

    this.#assertFrame?.assert();
    NOW.bump();

    if (this.#onAdvance.size > 0) {
      this.afterFlush(...this.#onAdvance);
    }

    this.#notifySubscribers(mutable);
    this.#renderables.bumped(mutable);

    return NOW.now;
  }

  mutation<T>(description: string, callback: () => T): T {
    if (isDebug()) {
      return this.#debug.mutation(description, callback);
    }

    return callback();
  }

  enqueue(...notifications: (() => void)[]): void {
    Queue.enqueue(...notifications);
  }

  afterFlush(...callbacks: (() => void)[]): void {
    Queue.afterFlush(...callbacks);
  }

  #enqueue(...notifications: (() => void)[]): void {
    Queue.enqueue(...notifications);
  }

  #notifySubscribers(...storages: MutableInternals[]) {
    for (let storage of storages) {
      let updaters = this.#updatersFor(storage);

      LOGGER.trace.log(
        `notifying listeners for cell\ncell: %o\nlisteners:%o`,
        storage,
        updaters
      );

      if (updaters.size > 0) {
        this.#enqueue(...updaters);
      }
    }
  }

  // Indicate that a particular cell was used inside of the current computation.
  didConsume(reactive: ReactiveProtocol) {
    if (this.#frame) {
      this.#frame.add(reactive);
    } else if (isDebug()) {
      // we don't add a consumption to the debug timeline if we're in a frame, because the frame
      // itself gets consumed
      this.#debug.consume(reactive);
    }
  }

  withAssertFrame(callback: () => void, description: string): void {
    let currentFrame = this.#assertFrame;

    try {
      this.#assertFrame = AssertFrame.describing(description);
      callback();
    } finally {
      this.#assertFrame = currentFrame;
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
    description: DescriptionArgs
  ): { readonly frame: FinalizedFrame<T>; readonly value: T } {
    const formula = Timeline.StartedFormula.create(description);

    try {
      const result = callback();
      return formula.done(result);
    } catch (e) {
      formula.finally();
      throw e;
    }
  }
}

export const TIMELINE = Timeline.create();
