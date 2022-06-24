import { Cell } from "@starbeam/core";
import { isObject } from "@starbeam/core-utils";
import es from "@starbeam/js";
import { REACTIVE } from "@starbeam/timeline";
import { exhaustive, expected, isEqual, verify } from "@starbeam/verify";

import type { InternalReactiveProps, ReactiveProps } from "./element.js";

type AnyRecord<T = any> = Record<PropertyKey, T>;

export class StableProps<Variables extends AnyRecord> {
  static from<Variables extends AnyRecord>(
    props: Variables
  ): StableProps<Variables> {
    const internal = Object.fromEntries(
      Object.entries(props).map(([key, value]) => initialPropEntry(key, value))
    ) as InternalReactiveProps<Variables>;

    const proxy = es.object(props);

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

    for (const [key, newValue] of Object.entries(newReactProps)) {
      changes = changes || updateProp(stableProps, proxy, key, newValue);
    }

    for (const key of Object.keys(stableProps)) {
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
function isPassthruProp(key: PropertyKey): boolean {
  verify(key, (value: unknown): value is string | symbol => {
    return typeof value === "string" || typeof value === "symbol";
  });

  if (typeof key === "symbol") {
    return true;
  } else if (typeof key === "string") {
    return key.startsWith("$") || key === "children";
  } else {
    exhaustive(key);
  }
}
function initialPropEntry(key: PropertyKey, value: unknown) {
  if (isPassthruProp(key)) {
    return [key, value];
  } else if (isObject(value) && REACTIVE in value) {
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
    if (props[key as PropertyKey] !== newValue) {
      props[key as PropertyKey] = newValue;

      changes = true;
    }
  } else if (key in props) {
    const existing = props[key as PropertyKey];

    if (isObject(newValue) && REACTIVE in newValue) {
      verify(
        existing,
        isEqual(newValue),
        expected("a reactive value passed to a Starbeam component").toBe(
          "the same value every time"
        )
      );
      return false;
    }

    verify(
      existing,
      Cell.is,
      expected
        .as(`an existing reactive prop`)
        .when(`a prop isn't 'children', prefixed with '$' or a symbol`)
    );

    const existingValue = existing.current;

    if (existingValue !== newValue) {
      existing.current = newValue;
      changes = true;
    }
  } else {
    props[key as PropertyKey] = Cell(newValue);
    changes = true;
  }

  return changes;
}
