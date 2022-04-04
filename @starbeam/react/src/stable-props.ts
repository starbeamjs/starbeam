import { is, reactive } from "@starbeam/core";
import { assert } from "@starbeam/debug";
import type { AnyIndex, AnyKey, AnyRecord } from "@starbeam/fundamental";
import { Cell, Reactive } from "@starbeam/reactive";
import { exhaustive, expected, verify } from "@starbeam/verify";
import type { InternalReactiveProps, ReactiveProps } from "./element.js";

export class StableProps<Variables extends AnyRecord> {
  static from<Variables extends AnyRecord>(
    props: Variables
  ): StableProps<Variables> {
    let internal = Object.fromEntries(
      Object.entries(props).map(([key, value]) => initialPropEntry(key, value))
    ) as InternalReactiveProps<Variables>;

    const proxy = reactive(props);

    return new StableProps(internal, proxy);
  }

  readonly #reactive: InternalReactiveProps<Variables>;
  readonly #proxy: Variables;

  constructor(reactive: InternalReactiveProps<Variables>, proxy: Variables) {
    this.#reactive = reactive;
    this.#proxy = proxy;
  }

  #sync(newReactProps: AnyRecord): boolean {
    const stableProps = this.#reactive;
    const proxy = this.#proxy;
    let changes = false;

    for (let [key, newValue] of Object.entries(newReactProps)) {
      changes = changes || updateProp(stableProps, proxy, key, newValue);
    }

    for (let key of Object.keys(stableProps)) {
      if (!(key in newReactProps)) {
        delete stableProps[key as keyof Variables];
        delete proxy[key as keyof Variables];
        changes = true;
      }
    }

    return changes;
  }

  update(newReactProps: AnyRecord): boolean {
    return this.#sync(newReactProps);
  }

  get reactive(): ReactiveProps<Variables> {
    return this.#reactive;
  }

  get proxy(): Variables {
    return this.#proxy;
  }
}
// TODO: `$`-prefixed props should be stable and a change to `children`
// should result in a re-render. But we may not want to require
// useCallback... probably?
function isPassthruProp(key: AnyKey): boolean {
  verify(
    key,
    is(
      (value: unknown): value is string | symbol =>
        typeof value === "string" || typeof value === "symbol"
    )
  );

  if (typeof key === "symbol") {
    return true;
  } else if (typeof key === "string") {
    return key.startsWith("$") || key === "children";
  } else {
    exhaustive(key);
  }
}
function initialPropEntry(key: AnyKey, value: unknown) {
  if (isPassthruProp(key)) {
    return [key, value];
  } else if (Reactive.is(value)) {
    return [key, value];
  } else {
    return [key, Cell(value)];
  }
}
// TODO: `$`-prefixed props should be stable and a change to `children`
// should result in a re-render. But we may not want to require
// useCallback... probably?
function updateProp(
  props: AnyRecord<Cell | unknown>,
  proxy: AnyRecord,
  key: string,
  newValue: unknown
): boolean {
  let changes = false;

  if (proxy[key] !== newValue) {
    proxy[key] = newValue;
  }

  if (isPassthruProp(key)) {
    if (props[key as AnyIndex] !== newValue) {
      props[key as AnyIndex] = newValue;

      changes = true;
    }
  } else if (key in props) {
    const existing = props[key as AnyIndex];

    if (Reactive.is(newValue)) {
      assert(
        existing === newValue,
        "When passing a reactive value to a Starbeam component, you must pass the same Reactive every time"
      );
      return false;
    }

    verify(
      existing,
      is(Cell.is),
      expected(`an existing reactive prop`)
        .toBe(`a cell`)
        .when(`a prop isn't 'children', prefixed with '$' or a symbol`)
    );

    const existingValue = existing.current;

    if (existingValue !== newValue) {
      existing.current = newValue;
      changes = true;
    }
  } else {
    props[key as AnyIndex] = Cell(newValue);
    changes = true;
  }

  return changes;
}
