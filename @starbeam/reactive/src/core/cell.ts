import { Abstraction, DisplayStruct } from "@starbeam/debug";
import { COORDINATOR } from "@starbeam/schedule";
import {
  INSPECT,
  REACTIVE,
  type MutableInternals,
  type ReactiveInternals,
} from "@starbeam/timeline";
import { expected, isValue, verify } from "@starbeam/verify";
import { MutableInternalsImpl } from "../internals/mutable.js";
import type { ReactiveValue } from "../reactive.js";

export class ReactiveCell<T> implements ReactiveValue<T> {
  static create<T>(value: T, bookkeeping: MutableInternals): ReactiveCell<T> {
    return new ReactiveCell(value, bookkeeping);
  }

  #value: T;
  readonly #bookkeeping: MutableInternals;

  private constructor(value: T, reactive: MutableInternals) {
    this.#value = value;
    this.#bookkeeping = reactive;
  }

  [INSPECT]() {
    const { description, debug } = this.#bookkeeping;

    return DisplayStruct(`Cell (${description})`, {
      value: this.#value,
      updated: debug.lastUpdated,
    });
  }

  freeze(): void {
    this.#bookkeeping.freeze();
  }

  set current(value: T) {}

  #set(value: T): void {
    this.#verifyMutable();

    const tx = COORDINATOR.begin(`updating ${this.#bookkeeping.description}`);
    this.#value = value;
    this.#bookkeeping.update();
    tx.commit();
  }

  #verifyMutable() {
    verify(
      this.#bookkeeping.isFrozen(),
      isValue(false),
      expected(`a cell`)
        .toBe(`non-frozen`)
        .when(`updating a cell`)
        .butGot(() => `a frozen cell`)
    );
  }

  /** impl Reactive<T> */
  get current(): T {
    this.#bookkeeping.consume();
    return this.#value;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#bookkeeping;
  }
}

export function Cell<T>(
  value: T,
  description = Abstraction.callerFrame()
): ReactiveCell<T> {
  return ReactiveCell.create(value, MutableInternalsImpl.create(description));
}

export type Cell<T> = ReactiveCell<T>;
