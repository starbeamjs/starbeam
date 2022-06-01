import { TrackedArray } from "./src/array.js";
import { TrackedMap, TrackedWeakMap } from "./src/map.js";
import TrackedObject from "./src/object.js";
import { TrackedSet, TrackedWeakSet } from "./src/set.js";

function ecma<T>(constructor: typeof Set): Set<T>;
function ecma<T extends object>(constructor: typeof WeakSet): Set<T>;
function ecma<K, V>(constructor: typeof Map): Map<K, V>;
function ecma<K extends object, V>(constructor: typeof WeakMap): WeakMap<K, V>;
function ecma(
  constructor: typeof Set | typeof WeakSet | typeof Map | typeof WeakMap
):
  | Set<unknown>
  | WeakSet<object>
  | Map<unknown, unknown>
  | WeakMap<object, unknown> {
  if (constructor === Set) {
    return new TrackedSet() as Set<unknown>;
  } else if (constructor === WeakSet) {
    return new TrackedWeakSet() as WeakSet<object>;
  } else if (constructor === Map) {
    return new TrackedMap() as Map<unknown, unknown>;
  } else if (constructor === WeakMap) {
    return new TrackedWeakMap() as WeakMap<object, unknown>;
  }

  throw new Error(`Unsupported constructor: ${constructor.name}`);
}

ecma.array = <T>(values: T[]) => {
  return new TrackedArray(values) as T[];
};

ecma.object = <T extends object>(values: T): T => {
  return new TrackedObject(values) as T;
};

export default ecma;
