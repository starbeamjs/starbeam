import type { Stack } from "@starbeam/debug";
import { type Description, descriptionFrom } from "@starbeam/debug";
import { getID } from "@starbeam/shared";
import {
  type Reactive,
  type ReactiveInternals,
  REACTIVE,
  ReactiveProtocol,
} from "@starbeam/timeline";

import { DelegateInternals } from "../delegate.js";
import { FormulaFn } from "../formula/formula.js";

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
    const descArgs = descriptionFrom({
      type: "collection:value",
      api: {
        package: "@starbeam/core",
        name: "ReactiveFormulaList",
      },
      fromUser: desc,
    });

    const list = FormulaFn(
      () => [...iterable].map((item): [Key, T] => [key(item), item]),
      descArgs
    );
    const description = ReactiveProtocol.description(list);
    const last = list();

    const map = new Map<Key, FormulaFn<U>>();

    for (const [key, item] of last) {
      map.set(
        key,
        FormulaFn(
          () => value(item),
          description.key(String(key), { id: getID() })
        )
      );
    }

    return new ReactiveFormulaList(last, list, map, value, description);
  }

  #last: Entry<T>[];
  #inputs: FormulaFn<Entry<T>[]>;
  #map: Map<Key, FormulaFn<U>>;
  #value: (item: T) => U;
  #description: Description;

  #outputs: FormulaFn<U[]>;

  readonly [REACTIVE]: ReactiveInternals;

  constructor(
    last: Entry<T>[],
    list: FormulaFn<Entry<T>[]>,
    map: Map<Key, FormulaFn<U>>,
    value: (item: T) => U,
    description: Description
  ) {
    this.#last = last;
    this.#inputs = list;
    this.#map = map;
    this.#value = value;
    this.#description = description;

    this.#outputs = FormulaFn(() => {
      this.#update();

      return [...this.#map.values()].map((formula) => formula());
    });

    this[REACTIVE] = DelegateInternals([this.#outputs]);
  }

  get current(): U[] {
    return this.read();
  }

  read(_caller?: Stack): U[] {
    return this.#outputs();
  }

  #update() {
    // this `current` happens inside a write phase, so we don't need to propagate a read caller
    // (which is used in the readonly phase to produce good errors in read barrier assertions).
    const next = this.#inputs();

    if (this.#last === next) {
      return;
    }

    this.#last = next;

    const map: Map<Key, FormulaFn<U>> = new Map();

    for (const [key, item] of next) {
      const formula = this.#map.get(key);

      if (formula === undefined) {
        map.set(
          key,
          FormulaFn(
            () => this.#value(item),
            ReactiveProtocol.description(this.#inputs).key("item")
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
