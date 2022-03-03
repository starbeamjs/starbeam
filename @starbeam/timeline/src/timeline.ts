import { config, Priority } from "@starbeam/config";
import { Coordinator, COORDINATOR, Work } from "@starbeam/schedule";
import { LOGGER } from "@starbeam/trace-internals";
import {
  ActiveFrame,
  AssertFrame,
  FrameChild,
  type FinalizedFrame,
} from "./frames.js";
import type { MutableInternals } from "./internals.js";
import { Timestamp } from "./timestamp.js";

export class Timeline {
  static create(): Timeline {
    return new Timeline(COORDINATOR, new Map(), new Set());
  }

  readonly #coordinator: Coordinator;
  #now = Timestamp.initial();
  #frame: ActiveFrame | null = null;
  #assertFrame: AssertFrame | null = null;

  readonly #onUpdate: WeakMap<MutableInternals, Set<() => void>>;
  readonly #onAdvance: Set<() => void>;

  private constructor(
    coordinator: Coordinator,
    updaters: WeakMap<MutableInternals, Set<() => void>>,
    onAdvance: Set<() => void>
  ) {
    this.#coordinator = coordinator;
    this.#onUpdate = updaters;
    this.#onAdvance = onAdvance;
  }

  on = {
    advance: (callback: () => void): (() => void) => {
      this.#onAdvance.add(callback);

      return () => {
        this.#onAdvance.delete(callback);
      };
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
  bump(storage: MutableInternals): Timestamp {
    this.#assertFrame?.assert();

    this.#now = this.#now.next();

    if (this.#onAdvance.size > 0) {
      this.#enqueue(...this.#onAdvance);
    }

    this.#notifySubscribers(storage);

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
  didConsume(storage: FrameChild) {
    if (this.#frame) {
      LOGGER.trace.log(`adding ${storage.description}`);
      this.#frame.add(storage);
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

  // Run a computation in the context of a frame, and return a finalized frame.
  withFrame<T>(
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
