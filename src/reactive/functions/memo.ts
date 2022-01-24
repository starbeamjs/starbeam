import type { FinalizedFrame } from "../../universe/frames";
import type { Timeline } from "../../universe/timeline";
import type { Reactive } from "../core";
import { HasMetadata, ReactiveMetadata } from "../metadata";

export class Memo<T> extends HasMetadata implements Reactive<T> {
  static create<T>(callback: () => T, timeline: Timeline): Memo<T> {
    return new Memo(callback, timeline);
  }

  readonly #callback: () => T;
  readonly #timeline: Timeline;
  #frame: FinalizedFrame<T> | null = null;

  /**
   * Every time the callback is called, the metadata for this function has an
   * opportunity to switch from dynamic to constant.
   */
  #metadata: ReactiveMetadata = ReactiveMetadata.Dynamic;

  private constructor(callback: () => T, timeline: Timeline) {
    super();
    this.#callback = callback;
    this.#timeline = timeline;
  }

  get metadata(): ReactiveMetadata {
    if (this.#frame) {
      return this.#frame.metadata;
    } else {
      return ReactiveMetadata.Dynamic;
    }
  }

  get current(): T {
    if (this.#frame) {
      let validation = this.#frame.validate();

      if (validation.status === "valid") {
        return validation.value;
      }
    }

    let { frame, initial } = this.#timeline.withFrame(this.#callback);
    this.#metadata = frame.metadata;
    this.#timeline.didConsume(frame);
    this.#frame = frame;
    return initial;
  }
}
