import { LIFETIME } from "../core/lifetime/lifetime.js";
import { TIMELINE } from "../core/timeline/timeline.js";
import { LOGGER } from "../strippable/trace.js";
import type { Cell } from "./cell.js";

type Teardown = () => void;

export class FrameSubscriber<T> {
  static create<T>(
    produce: () => T,
    description: string
  ): {
    subscribe(callback: () => void): FrameSubscriber<T>;
  } {
    return {
      subscribe: (notify) =>
        new FrameSubscriber(produce, notify, new Map(), description),
    };
  }

  readonly #produce: () => T;
  readonly #notify: () => void;
  readonly #cells: Map<Cell<unknown>, Teardown>;
  readonly #description: string;

  private constructor(
    produce: () => T,
    notify: () => void,
    cells: Map<Cell<unknown>, Teardown>,
    description: string
  ) {
    this.#produce = produce;
    this.#notify = notify;
    this.#cells = cells;
    this.#description = description;

    LIFETIME.on.finalize(this, () => {
      for (let [, teardown] of this.#cells) {
        teardown();
      }
    });
  }

  link(parent: object): this {
    LIFETIME.link(parent, this);
    return this;
  }

  poll(): T {
    let { frame, initial } = TIMELINE.withFrame(
      this.#produce,
      this.#description
    );

    console.log({ frame, initial });

    TIMELINE.didConsume(frame);

    // console.log(frame, frame.cells);
    this.#sync(new Set(frame.cells));

    return initial;
  }

  #sync(newCells: Set<Cell<unknown>>): void {
    for (let [cell, teardown] of this.#cells) {
      if (!newCells.has(cell)) {
        console.log(
          `tearing down (${this.#description}) cell`,
          cell,
          this.#notify
        );
        teardown();
        this.#cells.delete(cell);
      }
    }

    for (let cell of newCells) {
      if (!this.#cells.has(cell)) {
        LOGGER.trace.log(
          `setting up (${this.#description}) cell`,
          cell,
          this.#notify
        );

        let teardown = TIMELINE.on.update(cell, this.#notify);
        this.#cells.set(cell, teardown);
      }
    }
  }
}

export const Frame = FrameSubscriber.create;

// export function Frame<T>(
//   callback: () => T,
//   previous: FrameSnapshot,
//   description: string
// ): { snapshot: FrameSnapshot; value: T } {
//   let { frame, initial } = TIMELINE.withFrame(callback, description);

//   return { snapshot: FrameSnapshot.of(frame), value: initial };
// }
