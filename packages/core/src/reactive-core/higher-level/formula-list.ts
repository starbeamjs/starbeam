import type { Description } from "@starbeam/debug";
import { Stack } from "@starbeam/debug";
import { type ReactiveInternals, REACTIVE } from "@starbeam/timeline";

import { Reactive } from "../../reactive.js";
import { Formula } from "../formula/formula.js";

type Key = unknown;
type Entry<T> = [Key, T];

class ReactiveFormulaList<T, U> implements Reactive<U[]> {
  static create<T, U>(
    this: void,
    iterable: Iterable<T>,
    {
      key,
      value,
    }: {
      key: (item: T) => Key;
      value: (item: T) => U;
    },
    desc?: string | Description
  ) {
    const descArgs = Stack.description({
      type: "collection:value",
      api: {
        package: "@starbeam/core",
        name: "ReactiveFormulaList",
      },
      fromUser: desc,
    });

    const list = Formula(
      () => [...iterable].map((item): [Key, T] => [key(item), item]),
      descArgs
    );
    const description = Reactive.description(list);
    const last = list.current;

    const map = new Map<Key, Formula<U>>();

    for (const [key, item] of last) {
      map.set(
        key,
        Formula(() => value(item), description.key("item"))
      );
    }

    return new ReactiveFormulaList(last, list, map, value);
  }

  #last: Entry<T>[];
  #inputs: Formula<Entry<T>[]>;
  #map: Map<Key, Formula<U>>;
  #value: (item: T) => U;

  #outputs: Formula<U[]>;

  constructor(
    last: Entry<T>[],
    list: Formula<Entry<T>[]>,
    map: Map<Key, Formula<U>>,
    value: (item: T) => U
  ) {
    this.#last = last;
    this.#inputs = list;
    this.#map = map;
    this.#value = value;

    this.#outputs = Formula(() => {
      this.#update();

      return [...this.#map.values()].map((formula) => formula.current);
    });
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#outputs[REACTIVE];
  }

  get current(): U[] {
    return this.read(Stack.fromCaller());
  }

  read(caller: Stack): U[] {
    return this.#outputs.read(caller);
  }

  #update() {
    // this `current` happens inside a write phase, so we don't need to propagate a read caller
    // (which is used in the readonly phase to produce good errors in read barrier assertions).
    const next = this.#inputs.current;

    if (this.#last === next) {
      return;
    }

    this.#last = next;

    const map: Map<Key, Formula<U>> = new Map();

    for (const [key, item] of next) {
      const formula = this.#map.get(key);

      if (formula === undefined) {
        map.set(
          key,
          Formula(
            () => this.#value(item),
            Reactive.description(this.#inputs).key("item")
          )
        );
      } else {
        map.set(key, formula);
      }
    }

    this.#map = map;
  }
}

export type FormulaList<U> = ReactiveFormulaList<unknown, U>;
export const FormulaList = ReactiveFormulaList.create;
