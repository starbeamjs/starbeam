import { isObject } from "../utils";
import type { AbstractReactive } from "./core";
import { HasMetadata, ReactiveMetadata } from "./metadata";

export type InnerDict = {
  readonly [P in PropertyKey]: AbstractReactive<unknown>;
};

/**
 * `ReactiveRecord` wraps a JavaScript object whose values are other Reactive`
 * values. The keys of a `ReactiveRecord` are fixed at construction time, and
 * the `Reactive` values may not be changed at runtime.
 *
 * If you want to update the values of a `ReactiveRecord`, the reactive value
 * must be a `Cell`, and you must update the `Cell` directly.
 */
export class ReactiveRecord<D extends InnerDict> extends HasMetadata {
  static is(value: unknown): value is AnyReactiveRecord {
    return isObject(value) && value instanceof ReactiveRecord;
  }

  readonly #dict: D;

  constructor(dict: D) {
    super();
    this.#dict = dict;
  }

  get metadata(): ReactiveMetadata {
    return ReactiveMetadata.all(...Object.values(this.#dict));
  }

  get<K extends keyof D>(key: K): D[K] {
    return this.#dict[key];
  }
}

export type AnyReactiveRecord = ReactiveRecord<InnerDict>;
