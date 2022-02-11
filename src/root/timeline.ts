import type { AnyCell } from "../reactive/cell.js";
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

  // Returns the current timestamp
  get now(): Timestamp {
    return this.#now;
  }

  // Increment the current timestamp and return the incremented timestamp.
  bump(): Timestamp {
    this.#assertFrame?.assert();

    this.#now = this.#now.next();
    return this.#now;
  }

  // Indicate that a particular cell was used inside of the current computation.
  didConsume(cell: AnyCell | AnyFinalizedFrame) {
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
