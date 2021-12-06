import { BUMP, NOW, Timeline, Timestamp } from "../index";
import { CONSUME, ReactivityTimeline } from "../timeline/timeline";
import { Reactive } from "./core";

export class Cell<T> implements Reactive<T> {
  #value: T;
  #lastUpdate: Timestamp;
  #timeline: ReactivityTimeline;

  constructor(value: T, timeline: ReactivityTimeline) {
    this.#value = value;
    this.#timeline = timeline;
    this.#lastUpdate = timeline[NOW]();
  }

  readonly metadata = { isStatic: false };

  update(value: T) {
    this.#value = value;
    this.#lastUpdate = this.#timeline[BUMP]();
  }

  get current(): T {
    this.#timeline[CONSUME](this);
    return this.#value;
  }
}
