import { BUMP, NOW, Timeline, Timestamp } from "../index";
import { CONSUME } from "../timeline/timeline";
import { Reactive } from "./interface";

export class Cell<T> implements Reactive<T> {
  #value: T;
  // @ts-ignore: Unused variable
  #lastUpdate: Timestamp;
  #timeline: Timeline;

  constructor(value: T, timeline: Timeline) {
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
