import { ReactiveMetadata } from "../core/metadata.js";
import { TIMELINE } from "../core/timeline/timeline.js";
import type { Timestamp } from "../core/timeline/timestamp.js";
import { describeValue } from "../describe.js";
import { IS_UPDATED_SINCE } from "../fundamental/constants.js";
import type { Cell as CellType } from "../fundamental/types.js";
import { Abstraction } from "../index.js";
import { verify } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { expected } from "../strippable/verify-context.js";
import { ExtendsReactive } from "./base.js";
import { REACTIVE_BRAND } from "./internal.js";

export class ReactiveCell<T> extends ExtendsReactive<T> implements CellType {
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
    super({
      name: "Cell",
      description,
    });
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

  get cells(): [Cell] {
    return [this];
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
    this.#lastUpdate = TIMELINE.bump(this);
  }

  get current(): T {
    if (!this.#frozen) {
      TIMELINE.didConsume(this);
    }

    return this.#value;
  }

  toString() {
    return `Reactive (${this.#description})`;
  }

  [IS_UPDATED_SINCE](timestamp: Timestamp): boolean {
    return this.#lastUpdate.gt(timestamp);
  }
}

export type Cell<T = unknown> = CellType<T>;

export function Cell<T>(
  value: T,
  description = Abstraction.callerFrame()
): Cell<T> {
  return ReactiveCell.create(value, description);
}

Cell.is = <T>(value: unknown | Cell<T>): value is Cell<T> => {
  return value instanceof ReactiveCell;
};
