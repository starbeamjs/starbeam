import type { Cell } from "../reactive/cell.js";
import { LOGGER } from "../strippable/trace.js";
import {
  ActiveFrame,
  AnyFinalizedFrame,
  AssertFrame,
  FinalizedFrame,
} from "./frames.js";
import { Timestamp } from "./timestamp.js";

export class Timeline {
  static create(): Timeline {
    return new Timeline();
  }

  #now = Timestamp.initial();
  #frame: ActiveFrame | null = null;
  #assertFrame: AssertFrame | null = null;

  readonly #onAdvance: Set<() => void> = new Set();

  on = {
    advance: (callback: () => void): (() => void) => {
      this.#onAdvance.add(callback);

      return () => {
        this.#onAdvance.delete(callback);
      };
    },
  } as const;

  // Returns the current timestamp
  get now(): Timestamp {
    return this.#now;
  }

  // Increment the current timestamp and return the incremented timestamp.
  bump(): Timestamp {
    this.#assertFrame?.assert();

    this.#now = this.#now.next();

    Promise.resolve().then(() => {
      LOGGER.trace.log(`running callbacks for revision ${this.#now}`);
      for (let callback of this.#onAdvance) {
        callback();
      }
    });

    return this.#now;
  }

  // Indicate that a particular cell was used inside of the current computation.
  didConsume(cell: Cell | AnyFinalizedFrame) {
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
