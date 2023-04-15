import type { AutotrackingRuntime, CoreTag } from "@starbeam/interfaces";

export class TrackingStack implements AutotrackingRuntime {
  static create(): TrackingStack {
    return new TrackingStack();
  }

  #current: TrackingFrameData | undefined;

  start(): () => Set<CoreTag> {
    const frame: TrackingFrameData = { consumed: new Set() };
    const parent = this.#current;
    this.#current = frame;

    return () => {
      const consumed = frame.consumed;
      this.#current = parent;
      return consumed;
    };
  }

  consume(tag: CoreTag): void {
    const current = this.#current;

    if (current) {
      current.consumed.add(tag);
    }
  }
}

export interface TrackingFrameData {
  readonly consumed: Set<CoreTag>;
}

export const AUTOTRACKING_RUNTIME = TrackingStack.create();
