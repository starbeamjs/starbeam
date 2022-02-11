import { Group, LOGGER } from "../../strippable/trace.js";
import type { AnyFinalizedFrame, FinalizedFrame } from "../../root/frames.js";
import { TIMELINE, Timeline } from "../../root/timeline.js";
import type { AbstractReactive } from "../core.js";
import { HasMetadata, ReactiveMetadata } from "../metadata.js";

export class Memo<T> extends HasMetadata implements AbstractReactive<T> {
  static create<T>(callback: () => T, description: string): Memo<T> {
    return new Memo(callback, description);
  }

  readonly #callback: () => T;
  #frame: FinalizedFrame<T> | null = null;

  /**
   * Every time the callback is called, the metadata for this function has an
   * opportunity to switch from dynamic to constant.
   */
  #metadata: ReactiveMetadata = ReactiveMetadata.Dynamic;

  #description: string;

  private constructor(callback: () => T, description: string) {
    super();
    this.#callback = callback;
    this.#description = description;
  }

  get description(): string {
    return this.#description;
  }

  get metadata(): ReactiveMetadata {
    if (this.#frame) {
      return this.#frame.metadata;
    } else {
      return ReactiveMetadata.Dynamic;
    }
  }

  get current(): T {
    let group: Group;

    if (this.#frame) {
      let validationGroup = LOGGER.trace
        .group(
          `validating ${this.#description} (parent = ${
            this.#frame.description
          })`
        )
        .expanded();

      let validation = this.#frame.validate();

      if (validation.status === "valid") {
        LOGGER.trace.log(`=> valid frame for ${this.#description}`);
        validationGroup.end();

        TIMELINE.didConsume(this.#frame);
        return validation.value;
      } else {
        validationGroup.end();
        group = LOGGER.trace
          .group(`recomputing memo: ${this.#description}`)
          .expanded();
      }
    } else {
      group = LOGGER.trace
        .group(`initializing memo: ${this.#description}`)
        .expanded();
    }

    let newFrame: AnyFinalizedFrame;

    try {
      let { frame, initial } = TIMELINE.withFrame(
        this.#callback,
        `memo: ${this.#description}`
      );
      this.#metadata = frame.metadata;

      this.#frame = newFrame = frame;
      return initial;
    } finally {
      group.end();
      TIMELINE.didConsume(newFrame!);
    }
  }
}
