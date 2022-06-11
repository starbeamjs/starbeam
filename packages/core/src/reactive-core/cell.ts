import { isObject } from "@starbeam/core-utils";
import { type DescriptionArgs, DisplayStruct, Stack } from "@starbeam/debug";
import { type ReactiveInternals, INSPECT, REACTIVE } from "@starbeam/timeline";

import type { Reactive } from "../reactive.js";
import { MutableInternalsImpl } from "../storage/mutable.js";

export type Equality<T> = (a: T, b: T) => boolean;

function isEquality<T>(
  value: Equality<T> | string | DescriptionArgs
): value is Equality<T> {
  return typeof value === "function";
}

export class ReactiveCell<T> implements Reactive<T> {
  static create<T>(
    value: T,
    equals: Equality<T> = Object.is,
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

    return DisplayStruct(`Cell (${description.describe()})`, {
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

  /**
   * Returns true if the value was updated, and false if the value was already present and equal to
   * the new value.
   */
  set(value: T): boolean {
    return this.#set(value);
  }

  update(updater: (prev: T) => T): boolean {
    return this.#set(updater(this.#value));
  }

  #set(value: T): boolean {
    if (this.#equals(this.#value, value)) {
      return false;
    }

    this.#value = value;
    this.#internals.update();
    return true;
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
  description?: string | (DescriptionArgs & { equals?: Equality<T> })
): ReactiveCell<T> {
  if (typeof description === "string" || description === undefined) {
    return ReactiveCell.create(
      value,
      Object.is,
      MutableInternalsImpl.create(Stack.description(description))
    );
  }

  const { equals, ...rest } = description;

  return ReactiveCell.create(
    value,
    equals,
    MutableInternalsImpl.create(Stack.description(rest))
  );
}

Cell.is = <T>(value: unknown): value is Cell<T> => {
  return isObject(value) && value instanceof ReactiveCell;
};

export type Cell<T = unknown> = ReactiveCell<T>;
