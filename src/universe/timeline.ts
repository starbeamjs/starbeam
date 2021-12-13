import type { AnyCell } from "../reactive/cell";
import { ActiveFrame, AnyFinalizedFrame, FinalizedFrame } from "./frames";
import { Timestamp } from "./timestamp";

export class Timeline {
  static create(): Timeline {
    return new Timeline();
  }

  #now = Timestamp.initial();
  #frame: ActiveFrame | null = null;

  // Returns the current timestamp
  get now(): Timestamp {
    return this.#now;
  }

  // Increment the current timestamp and return the incremented timestamp.
  bump(): Timestamp {
    this.#now = this.#now.next();
    return this.#now;
  }

  // Indicate that a particular cell was used inside of the current computation.
  didConsume(cell: AnyCell | AnyFinalizedFrame) {
    if (this.#frame) {
      this.#frame.add(cell);
    }
  }

  // Run a computation in the context of a frame, and return a finalized frame.
  withFrame<T>(callback: () => T): { frame: FinalizedFrame<T>; initial: T } {
    let currentFrame = this.#frame;

    try {
      this.#frame = new ActiveFrame();
      let result = callback();
      return this.#frame.finalize(result, this.#now);
    } finally {
      this.#frame = currentFrame;
    }
  }
}
