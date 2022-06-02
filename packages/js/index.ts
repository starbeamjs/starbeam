import type { Description } from "@starbeam/debug";
import { Stack } from "@starbeam/debug";

import { Collection } from "./src/collection.js";
import { TrackedMap, TrackedWeakMap } from "./src/map.js";
import TrackedObject from "./src/object.js";
import { TrackedSet, TrackedWeakSet } from "./src/set.js";

function reactive<T>(constructor: typeof Set): Set<T>;
function reactive<T extends object>(constructor: typeof WeakSet): Set<T>;
function reactive<K, V>(constructor: typeof Map): Map<K, V>;
function reactive<K extends object, V>(
  constructor: typeof WeakMap
): WeakMap<K, V>;
function reactive(
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

reactive.Map = <K, V>(description?: string | Description) => {
  const map = new TrackedMap() as Map<K, V>;
  Collection.for(map).description = Stack.description("{Map}", description);
  return map;
};

reactive.WeakMap = <K extends object, V>(
  description?: string | Description
) => {
  const map = new TrackedWeakMap() as WeakMap<K, V>;
  Collection.for(map).description = Stack.description("{WeakMap}", description);
  return map;
};

reactive.Set = <T>(description?: string | Description) => {
  const set = new TrackedSet() as Set<T>;
  Collection.for(set).description = Stack.description("{Set}", description);
  return set;
};

reactive.WeakSet = <T extends object>(description?: string | Description) => {
  const set = new TrackedWeakSet() as WeakSet<T>;
  Collection.for(set).description = Stack.description("{WeakSet}", description);
  return set;
};

reactive.object = <T extends object>(
  values: T,
  description?: string | Description
): T => {
  const object = new TrackedObject(values) as T;
  Collection.for(object).description = Stack.description(
    "{object}",
    description
  );
  return object;
};

export default reactive;
