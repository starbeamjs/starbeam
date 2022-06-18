import { Cell } from "@starbeam/core";
import type { DescriptionArgs } from "@starbeam/debug";
import { Stack } from "@starbeam/debug";

import TrackedArray from "./src/array.js";
import { ReactiveMap, ReactiveSet } from "./src/iterable.js";
import { TrackedWeakMap } from "./src/map.js";
import TrackedObject from "./src/object.js";
import { TrackedWeakSet } from "./src/set.js";

export const reactive = (
  target: unknown,
  key: PropertyKey,
  _descriptor?: object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  const CELLS = new WeakMap<object, Cell>();

  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get: function (this: object) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cell: Cell<any> | undefined = CELLS.get(this);

      if (!cell) {
        cell = Cell(undefined, `@reactive ${String(key)}`);
        CELLS.set(this, cell);
      }

      return cell.current as unknown;
    },
    set: function (this: object, value: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cell: Cell<any> | undefined = CELLS.get(this);

      if (!cell) {
        cell = Cell(undefined, `@reactive ${String(key)}`);
        CELLS.set(this, cell);
      }

      cell.set(value);
    },
  });
};

reactive.Map = <K, V>(description?: string | DescriptionArgs): Map<K, V> => {
  return ReactiveMap.reactive(Object.is, Stack.description(description));
};

reactive.WeakMap = <K extends object, V>(
  description?: string | DescriptionArgs
): WeakMap<K, V> => {
  return TrackedWeakMap.reactive<K, V>(Stack.description(description));
};

reactive.Set = <T>(description?: string | DescriptionArgs): Set<T> => {
  return ReactiveSet.reactive(Object.is, Stack.description(description));
};

reactive.WeakSet = <T extends object>(
  description?: string | DescriptionArgs
): WeakSet<T> => {
  return TrackedWeakSet.reactive(Stack.description(description));
};

reactive.object = <T extends object>(
  values: T,
  description?: string | DescriptionArgs
): T => {
  return TrackedObject.reactive(Stack.description(description), values);
};

reactive.array = <T>(
  values: T[],
  description?: string | DescriptionArgs
): T[] => {
  return new TrackedArray(Stack.description(description), values) as T[];
};

export default reactive;
