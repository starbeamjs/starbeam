import { isObject } from "@starbeam/core-utils";
import { DisplayStruct, Stack } from "@starbeam/debug";
import {
  type ReactiveInternals,
  INSPECT,
  REACTIVE,
  TX,
} from "@starbeam/timeline";

import type { Reactive } from "../reactive.js";
import { MutableInternalsImpl } from "../storage/mutable.js";

export type Equality<T> = (a: T, b: T) => boolean;

export class ReactiveCell<T> implements Reactive<T> {
  static create<T>(
    value: T,
    equals: Equality<T>,
    internals: MutableInternalsImpl
  ): ReactiveCell<T> {
    return new ReactiveCell(value, equals, internals);
  }

  #value: T;
  readonly #internals: MutableInternalsImpl;
  readonly #equals: Equality<T>;

  private constructor(
    value: T,
    equals: Equality<T>,
    reactive: MutableInternalsImpl
  ) {
    this.#value = value;
    this.#equals = equals;
    this.#internals = reactive;
  }

  [INSPECT]() {
    const { description, debug } = this.#internals;

    return DisplayStruct(`Cell (${description})`, {
      value: this.#value,
      updated: debug.lastUpdated,
    });
  }

  toString() {
    return `Cell (${String(this.#value)})`;
  }

  freeze(): void {
    this.#internals.freeze();
  }

  get current(): T {
    this.#internals.consume();
    return this.#value;
  }

  set current(value: T) {
    this.#set(value);
  }

  set(value: T) {
    this.#set(value);
  }

  update(updater: (prev: T) => T): void {
    this.#set(updater(this.#value));
  }

  #set(value: T): void {
    if (this.#equals(this.#value, value)) {
      return;
    }

    TX.batch(`updating ${this.#internals.description}`, () => {
      this.#value = value;
      this.#internals.update();
    });
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#internals;
  }
}

/**
 * The `equals` parameter is used to determine whether a new value is equal to
 * the current value. If `equals` returns `true` for a new value, the old value
 * remains in the cell and the cell's timestamp doesn't advance.
 *
 * It defaults to `Object.is` (`===` except that `Object.is(NaN, NaN)` is
 * `true`).
 * */
export function Cell<T>(
  value: T,
  equals: Equality<T>,
  description?: string
): ReactiveCell<T>;
export function Cell<T>(value: T, description?: string): ReactiveCell<T>;
export function Cell<T>(
  value: T,
  equals?: Equality<T> | string,
  description?: string
): ReactiveCell<T> {
  if (equals === undefined) {
    return ReactiveCell.create(
      value,
      Object.is,
      MutableInternalsImpl.create(Stack.describeCaller())
    );
  } else if (typeof equals === "string") {
    return ReactiveCell.create(
      value,
      Object.is,
      MutableInternalsImpl.create(equals)
    );
  } else {
    return ReactiveCell.create(
      value,
      equals,
      MutableInternalsImpl.create(description ?? Stack.describeCaller())
    );
  }
}

Cell.is = <T>(value: unknown): value is Cell<T> => {
  return isObject(value) && value instanceof ReactiveCell;
};

export type Cell<T = unknown> = ReactiveCell<T>;
