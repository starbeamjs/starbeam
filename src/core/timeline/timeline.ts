import { Timestamp } from "./timestamp.js";
import { ActiveFrame, AssertFrame, type FinalizedFrame } from "./frames.js";
import type { Cell } from "../../fundamental/types.js";
import { LOGGER } from "../../strippable/trace.js";
import {
  Coordinator,
  COORDINATOR,
  Priority,
  Work,
} from "../../fundamental/coordinator.js";

export class Timeline {
  static create(): Timeline {
    return new Timeline(COORDINATOR, new Map(), new Set());
  }

  readonly #coordinator: Coordinator;
  #now = Timestamp.initial();
  #frame: ActiveFrame | null = null;
  #assertFrame: AssertFrame | null = null;

  readonly #onUpdate: WeakMap<Cell<unknown>, Set<() => void>>;
  readonly #onAdvance: Set<() => void>;

  private constructor(
    coordinator: Coordinator,
    updaters: WeakMap<Cell<unknown>, Set<() => void>>,
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

    update: (cell: Cell<unknown>, callback: () => void): (() => void) => {
      console.log(
        `adding listener for cell\ncell:`,
        cell,
        `\nlistener:`,
        callback
      );

      let callbacks = this.#updatersFor(cell);
      callbacks.add(callback);

      return () => {
        callbacks.delete(callback);
      };
    },
  } as const;

  #updatersFor(cell: Cell<unknown>): Set<() => void> {
    let callbacks = this.#onUpdate.get(cell);

    if (!callbacks) {
      callbacks = new Set();
      this.#onUpdate.set(cell, callbacks);
    }

    return callbacks;
  }

  // Returns the current timestamp
  get now(): Timestamp {
    return this.#now;
  }

  // Increment the current timestamp and return the incremented timestamp.
  bump(cell: Cell): Timestamp {
    this.#assertFrame?.assert();

    this.#now = this.#now.next();

    if (this.#onAdvance.size > 0) {
      this.#enqueue(...this.#onAdvance);
    }

    this.#notifyCells(cell);

    return this.#now;
  }

  #enqueue(...notifications: (() => void)[]): void {
    for (let notification of notifications) {
      this.#coordinator.enqueue(
        Work.create(Priority.BeforeLayout, notification)
      );
    }
  }

  #notifyCells(...cells: Cell[]) {
    for (let cell of cells) {
      let updaters = this.#updatersFor(cell);

      console.log(
        `notifying listeners for cell\ncell: %o\nlisteners:%o`,
        cell,
        updaters
      );

      if (updaters.size > 0) {
        this.#enqueue(...updaters);
      }
    }
  }

  // Indicate that a particular cell was used inside of the current computation.
  didConsume(cell: Cell | FinalizedFrame) {
    if (this.#frame) {
      LOGGER.trace.log(`adding ${cell.description}`);
      this.#frame.add(cell);
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
  ): { frame: FinalizedFrame<T>; initial: T } {
    let currentFrame = this.#frame;

    try {
      this.#frame = ActiveFrame.create(description);
      let result = callback();

      return this.#frame.finalize(result, this.#now);
    } finally {
      this.#frame = currentFrame;
    }
  }
}

export const TIMELINE = Timeline.create();
