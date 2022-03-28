import { DisplayStruct } from "@starbeam/debug";
import { isObject } from "@starbeam/fundamental";
import { COORDINATOR } from "@starbeam/schedule";
import {
  INSPECT,
  REACTIVE,
  type MutableInternals,
  type ReactiveInternals,
} from "@starbeam/timeline";
import { Abstraction } from "@starbeam/trace-internals";
import { expected, isEqual, verify } from "@starbeam/verify";
import { MutableInternalsImpl } from "../internals/mutable.js";
import type { Reactive, ReactiveValue } from "../reactive.js";

export class ReactiveCell<T> implements ReactiveValue<T> {
  static create<T>(value: T, internals: MutableInternals): ReactiveCell<T> {
    return new ReactiveCell(value, internals);
  }

  #value: T;
  readonly #internals: MutableInternals;

  private constructor(value: T, reactive: MutableInternals) {
    this.#value = value;
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
    return `Cell (${this.#value})`;
  }

  freeze(): void {
    this.#internals.freeze();
  }

  /** impl Reactive<T> */
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
    this.#verifyMutable();

    const tx = COORDINATOR.begin(`updating ${this.#internals.description}`);
    this.#value = value;
    this.#internals.update();
    tx.commit();
  }

  #verifyMutable() {
    verify(
      this.#internals.isFrozen(),
      isEqual(false),
      expected(`a cell`)
        .toBe(`non-frozen`)
        .when(`updating a cell`)
        .butGot(() => `a frozen cell`)
    );
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#internals;
  }
}

export function Cell<T>(
  value: T,
  description = Abstraction.callerFrame()
): ReactiveCell<T> {
  return ReactiveCell.create(value, MutableInternalsImpl.create(description));
}

Cell.is = <T>(value: unknown | Reactive<T>): value is Cell<T> =>
  isObject(value) && value instanceof ReactiveCell;

export type Cell<T = unknown> = ReactiveCell<T>;
