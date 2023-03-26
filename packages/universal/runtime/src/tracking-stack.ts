import { iterableHasItems } from "@starbeam/core-utils";
import type { Tag } from "@starbeam/interfaces";

export class TrackingStack {
  static create(): TrackingStack {
    return new TrackingStack();
  }

  #current: TrackingFrameData | undefined;

  start<T extends Tag>({
    intoTag,
  }: {
    intoTag: (tags: Set<Tag>) => T;
  }): () => T {
    const frame: TrackingFrameData = { consumed: new Set() };
    const parent = this.#current;
    this.#current = frame;

    return () => {
      const tag = intoTag(frame.consumed);

      if (parent) {
        this.#current = parent;

        if (iterableHasItems(tag.dependencies())) {
          parent.consumed.add(tag);
        }
      }

      return tag;
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
