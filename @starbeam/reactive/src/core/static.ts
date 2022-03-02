import { Abstraction } from "@starbeam/debug";
import {
  REACTIVE,
  type ReactiveInternals,
  type StaticInternals,
} from "@starbeam/timeline";
import { StaticInternalsImpl } from "../internals/static.js";
import type { ReactiveValue } from "../reactive.js";

export class StaticValue<T> implements ReactiveValue<T> {
  static create<T>(value: T, description: string): StaticValue<T> {
    return new StaticValue(value, StaticInternalsImpl.create(description));
  }

  readonly #value: T;
  readonly #bookkeeping: StaticInternals;

  private constructor(value: T, bookkeeping: StaticInternals) {
    this.#value = value;
    this.#bookkeeping = bookkeeping;
  }

  /** impl Reactive<T> */
  get current(): T {
    return this.#value;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#bookkeeping;
  }
}

export function Static<T>(
  value: T,
  description = Abstraction.callerFrame()
): StaticValue<T> {
  return StaticValue.create(value, description);
}

export type Static<T> = StaticValue<T>;
