import { IS_UPDATED_SINCE } from "../brands.js";
import type { Timeline } from "../universe/timeline.js";
import type { Timestamp } from "../universe/timestamp.js";
import { AbstractReactive } from "./core.js";
import { ReactiveMetadata } from "./metadata.js";
import { REACTIVE_BRAND } from "./internal.js";
import { verify } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { expected } from "../strippable/verify-context.js";
import { describeValue } from "../describe.js";

export class Cell<T> extends AbstractReactive<T> {
  static create<T>(value: T, timeline: Timeline, description: string): Cell<T> {
    return new Cell(
      value,
      timeline,
      timeline.now,
      `cell: ${description}`,
      false
    );
  }

  #value: T;
  #lastUpdate: Timestamp;
  readonly #timeline: Timeline;
  readonly #description: string;
  #frozen: boolean;

  private constructor(
    value: T,
    timeline: Timeline,
    lastUpdate: Timestamp,
    description: string,
    frozen: boolean
  ) {
    super();
    REACTIVE_BRAND.brand(this);
    this.#value = value;
    this.#timeline = timeline;
    this.#lastUpdate = lastUpdate;
    this.#description = description;
    this.#frozen = frozen;
  }

  get description(): string {
    return `${this.#description} (current value = ${describeValue(
      this.#value
    )})`;
  }

  get metadata(): ReactiveMetadata {
    return this.#frozen ? ReactiveMetadata.Constant : ReactiveMetadata.Dynamic;
  }

  freeze(): void {
    this.#frozen = true;
  }

  update(value: T) {
    verify(
      this.#frozen,
      is.value(false),
      expected(`a cell`)
        .toBe(`non-frozen`)
        .when(`updating a cell`)
        .butGot(() => `a frozen cell`)
    );

    this.#value = value;
    this.#lastUpdate = this.#timeline.bump();
  }

  get current(): T {
    if (!this.#frozen) {
      this.#timeline.didConsume(this);
    }

    return this.#value;
  }

  [IS_UPDATED_SINCE](timestamp: Timestamp): boolean {
    return this.#lastUpdate.gt(timestamp);
  }
}

export type AnyCell = Cell<unknown>;
