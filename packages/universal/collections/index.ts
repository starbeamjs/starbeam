import type { Description } from "@starbeam/interfaces";
import { RUNTIME } from "@starbeam/reactive";
import { Cell } from "@starbeam/universal";

import TrackedArray from "./src/array.js";
import { ReactiveMap, ReactiveSet } from "./src/iterable.js";
import { TrackedWeakMap } from "./src/map.js";
import TrackedObject from "./src/object.js";
import { TrackedWeakSet } from "./src/set.js";

export { cached } from "./src/decorator.js";

interface DefaultExport extends PropertyDecorator {
  map: <K, V>(description?: string | Description) => Map<K, V>;
  object: <T extends object>(
    values: T,
    description?: string | Description
  ) => T;
}

export const reactive = (
  target: unknown,
  key: PropertyKey,
  _descriptor?: object
): void => {
  const CELLS = new WeakMap<object, Cell>();

  Object.defineProperty(target, key, {
    enumerable: true,
    configurable: true,
    get: function (this: object) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cell: Cell<any> | undefined = CELLS.get(this);

      if (!cell) {
        cell = Cell(undefined, { description: `@reactive ${String(key)}` });
        CELLS.set(this, cell);
      }

      return cell.current as unknown;
    },
    set: function (this: object, value: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cell: Cell<any> | undefined = CELLS.get(this);

      if (!cell) {
        cell = Cell(undefined, { description: `@reactive ${String(key)}` });
        CELLS.set(this, cell);
      }

      cell.set(value);
    },
  });
};

reactive.Map = <K, V>(description?: string | Description): Map<K, V> => {
  return ReactiveMap.reactive(
    Object.is,
    RUNTIME.Desc?.("collection", description)
  );
};

reactive.WeakMap = <K extends object, V>(
  description?: string | Description
): WeakMap<K, V> => {
  return TrackedWeakMap.reactive<K, V>(
    RUNTIME.Desc?.("collection", description)
  );
};

reactive.Set = <T>(description?: string | Description): Set<T> => {
  return ReactiveSet.reactive(
    Object.is,
    RUNTIME.Desc?.("collection", description)
  );
};

reactive.WeakSet = <T extends object>(
  description?: string | Description
): WeakSet<T> => {
  return TrackedWeakSet.reactive(RUNTIME.Desc?.("collection", description));
};

export function object<T extends Record<string, unknown>>(
  this: void,
  values: T,
  description?: string | Description
): T {
  return TrackedObject.reactive(
    RUNTIME.Desc?.("collection", description),
    values
  );
}

reactive.object = object;

reactive.array = <T>(values: T[], description?: string | Description): T[] => {
  return new TrackedArray(
    RUNTIME.Desc?.("collection", description),
    values
  ) as T[];
};

export default reactive as unknown as DefaultExport;
