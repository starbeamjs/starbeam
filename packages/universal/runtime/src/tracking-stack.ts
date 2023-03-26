import type { AutotrackingRuntime, Tag } from "@starbeam/interfaces";

export class TrackingStack implements AutotrackingRuntime {
  static create(): TrackingStack {
    return new TrackingStack();
  }

  #current: TrackingFrameData | undefined;

  start(): () => Set<Tag> {
    const frame: TrackingFrameData = { consumed: new Set() };
    const parent = this.#current;
    this.#current = frame;

    return () => {
      const consumed = frame.consumed;
      this.#current = parent;
      return consumed;
    };
  }

  consume(tag: Tag): void {
    const current = this.#current;

    if (current) {
      current.consumed.add(tag);
    }
  }
}

export interface TrackingFrameData {
  readonly consumed: Set<Tag>;
}

export const AUTOTRACKING_RUNTIME = TrackingStack.create();
