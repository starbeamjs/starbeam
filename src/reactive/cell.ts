import { BUMP, CONSUME, NOW, ReactivityTimeline } from "../timeline/timeline";
import { Timestamp } from "../timeline/timestamp";
import { Reactive } from "./core";
import { REACTIVE_BRAND } from "./internal";

export class Cell<T> implements Reactive<T> {
  #value: T;
  // @ts-ignore: Unused variable
  #lastUpdate: Timestamp;
  #timeline: ReactivityTimeline;

  constructor(value: T, timeline: ReactivityTimeline) {
    REACTIVE_BRAND.brand(this);
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
