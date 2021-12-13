import type { FinalizedFrame } from "../../universe/frames";
import type { Timeline } from "../../universe/timeline";
import type { Reactive } from "../core";

export class Memo<T> implements Reactive<T> {
  static create<T>(callback: () => T, timeline: Timeline): Memo<T> {
    return new Memo(callback, timeline);
  }

  readonly metadata = {
    isStatic: false,
  };

  readonly #callback: () => T;
  readonly #timeline: Timeline;
  #frame: FinalizedFrame<T> | null = null;

  private constructor(callback: () => T, timeline: Timeline) {
    this.#callback = callback;
    this.#timeline = timeline;
  }

  get current(): T {
    if (this.#frame) {
      let validation = this.#frame.validate();

      if (validation.status === "valid") {
        return validation.value;
      }
    }

    let { frame, initial } = this.#timeline.withFrame(this.#callback);
    this.#timeline.didConsume(frame);
    this.#frame = frame;
    return initial;
  }
}
