import { IS_UPDATED_SINCE } from "../brands";
import type { Timeline } from "../universe/timeline";
import type { Timestamp } from "../universe/timestamp";
import type { Reactive } from "./core";
import { REACTIVE_BRAND } from "./internal";

export class Cell<T> implements Reactive<T> {
  #value: T;
  // @ts-ignore: Unused variable
  #lastUpdate: Timestamp;
  #timeline: Timeline;

  constructor(value: T, timeline: Timeline) {
    REACTIVE_BRAND.brand(this);
    this.#value = value;
    this.#timeline = timeline;
    this.#lastUpdate = timeline.now;
  }

  readonly metadata = { isStatic: false };

  update(value: T) {
    this.#value = value;
    this.#lastUpdate = this.#timeline.bump();
  }

  get current(): T {
    this.#timeline.didConsume(this);
    return this.#value;
  }

  [IS_UPDATED_SINCE](timestamp: Timestamp): boolean {
    return this.#lastUpdate.gt(timestamp);
  }
}

export type AnyCell = Cell<unknown>;
