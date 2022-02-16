import { describeValue } from "../describe.js";
import { TIMELINE } from "../root/timeline.js";
import type { Timestamp } from "../root/timestamp.js";
import { verify } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { expected } from "../strippable/verify-context.js";
import { AbstractReactive } from "./core.js";
import { REACTIVE_BRAND } from "./internal.js";
import { ReactiveMetadata } from "./metadata.js";

export class ReactiveCell<T> extends AbstractReactive<T> {
  static create<T>(value: T, description: string): ReactiveCell<T> {
    return new ReactiveCell(value, TIMELINE.now, description, false);
  }

  #value: T;
  #lastUpdate: Timestamp;
  readonly #description: string;
  #frozen: boolean;

  private constructor(
    value: T,
    lastUpdate: Timestamp,
    description: string,
    frozen: boolean
  ) {
    super();
    REACTIVE_BRAND.brand(this);
    this.#value = value;
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

  update(value: T): void {
    verify(
      this.#frozen,
      is.value(false),
      expected(`a cell`)
        .toBe(`non-frozen`)
        .when(`updating a cell`)
        .butGot(() => `a frozen cell`)
    );

    this.#value = value;
    this.#lastUpdate = TIMELINE.bump();
  }

  get current(): T {
    if (!this.#frozen) {
      TIMELINE.didConsume(this);
    }

    return this.#value;
  }

  IS_UPDATED_SINCE(timestamp: Timestamp): boolean {
    return this.#lastUpdate.gt(timestamp);
  }
}

export type Cell<T = unknown> = ReactiveCell<T>;

export function Cell<T>(value: T, description = "(anonymous cell)"): Cell<T> {
  return ReactiveCell.create(value, description);
}
