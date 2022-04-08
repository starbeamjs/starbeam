import { config, Priority } from "@starbeam/config";
import { Stack } from "@starbeam/debug-utils";
import { Coordinator, COORDINATOR, Work } from "@starbeam/schedule";
import { LOGGER } from "@starbeam/trace-internals";
import { ActiveFrame, AssertFrame, type FinalizedFrame } from "./frames.js";
import type { MutableInternals } from "./internals.js";
import { REACTIVE, type Reactive, type ReactiveProtocol } from "./reactive.js";
import { Renderable, Renderables } from "./renderable.js";
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
      `You cannot mutate a data cell during the Render phase. You attempted to mutate ${internals.description}`
    );
  }
}

export class Timeline {
  static create(): Timeline {
    return new Timeline(
      COORDINATOR,
      ActionsPhase.create("initialization"),
      Renderables.create(),
      new Map(),
      new Set()
    );
  }

  readonly #coordinator: Coordinator;
  #phase: Phase;
  #now = Timestamp.initial();
  #frame: ActiveFrame | null = null;
  #assertFrame: AssertFrame | null = null;

  readonly #renderables: Renderables;
  readonly #onUpdate: WeakMap<MutableInternals, Set<() => void>>;
  readonly #onAdvance: Set<() => void>;

  private constructor(
    coordinator: Coordinator,
    phase: RenderPhase | ActionsPhase,
    renderables: Renderables,
    updaters: WeakMap<MutableInternals, Set<() => void>>,
    onAdvance: Set<() => void>
  ) {
    this.#coordinator = coordinator;
    this.#phase = phase;
    this.#renderables = renderables;
    this.#onUpdate = updaters;
    this.#onAdvance = onAdvance;
  }

  on = {
    render: (callback: () => void): (() => void) => {
      this.#onAdvance.add(callback);

      return () => {
        this.#onAdvance.delete(callback);
      };
    },

    change: <T>(
      input: Reactive<T>,
      ready: (renderable: Renderable<T>) => void,
      description = Stack.describeCaller()
    ): Renderable<T> => {
      const renderable = Renderable.create(input, { ready }, description);
      this.#renderables.insert(renderable as Renderable<unknown>);

      return renderable;
    },

    update: (storage: MutableInternals, callback: () => void): (() => void) => {
      LOGGER.trace.log(
        `adding listener for cell\ncell: %o\ncallback:%o`,
        storage,
        callback
      );

      let callbacks = this.#updatersFor(storage);
      callbacks.add(callback);

      return () => {
        LOGGER.trace.withStack.log(
          `tearing down listener for cell\ncell: %o\ncallback: %o`,
          storage,
          callback
        );
        callbacks.delete(callback);
      };
    },
  } as const;

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
    return this.#now;
  }

  // Increment the current timestamp and return the incremented timestamp.
  bump(mutable: MutableInternals): Timestamp {
    this.#phase.bump(mutable);

    this.#assertFrame?.assert();

    this.#now = this.#now.next();

    if (this.#onAdvance.size > 0) {
      this.#enqueue(...this.#onAdvance);
    }

    this.#notifySubscribers(mutable);
    this.#renderables.bumped(mutable);

    return this.#now;
  }

  #enqueue(...notifications: (() => void)[]): void {
    for (let notification of notifications) {
      this.#coordinator.enqueue(
        Work.create(
          config().get("DefaultPriority") ?? Priority.BeforeLayout,
          notification
        )
      );
    }
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
      LOGGER.trace.log(`adding ${reactive[REACTIVE].description}`);
      this.#frame.add(reactive);
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
    description: string
  ): { readonly frame: FinalizedFrame<T>; readonly value: T } {
    const currentFrame = this.#frame;

    try {
      this.#frame = ActiveFrame.create(description);
      const result = callback();

      const newFrame = this.#frame.finalize(result, this.#now);
      this.#frame = currentFrame;
      this.didConsume(newFrame.frame);
      return newFrame;
    } catch (e) {
      this.#frame = currentFrame;
      throw e;
    }
  }
}

export const TIMELINE = Timeline.create();
