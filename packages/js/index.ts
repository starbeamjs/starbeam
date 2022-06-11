import type { DescriptionArgs } from "@starbeam/debug";
import { Stack } from "@starbeam/debug";

import TrackedArray from "./src/array.js";
import { ReactiveMap } from "./src/iterable.js";
import { TrackedWeakMap } from "./src/map.js";
import TrackedObject from "./src/object.js";
import { TrackedSet, TrackedWeakSet } from "./src/set.js";

function reactive<T>(constructor: typeof Set, description?: string): Set<T>;
function reactive<T extends object>(
  constructor: typeof WeakSet,
  description?: string
): Set<T>;
function reactive<K, V>(
  constructor: typeof Map,
  description?: string
): Map<K, V>;
function reactive<K extends object, V>(
  constructor: typeof WeakMap,
  description?: string
): WeakMap<K, V>;
function reactive(
  constructor: typeof Set | typeof WeakSet | typeof Map | typeof WeakMap,
  description?: string
):
  | Set<unknown>
  | WeakSet<object>
  | Map<unknown, unknown>
  | WeakMap<object, unknown> {
  if (constructor === Set) {
    return reactive.Set(description);
  } else if (constructor === WeakSet) {
    return reactive.WeakSet(description);
  } else if (constructor === Map) {
    return reactive.Map(description);
  } else if (constructor === WeakMap) {
    return reactive.WeakMap(description);
  }

  throw new Error(`Unsupported constructor: ${constructor.name}`);
}

reactive.Map = <K, V>(description?: string): Map<K, V> => {
  return ReactiveMap.reactive(Object.is, Stack.description(description));
};

reactive.WeakMap = <K extends object, V>(
  description?: string | DescriptionArgs
): WeakMap<K, V> => {
  return TrackedWeakMap.reactive<K, V>(Stack.description(description));
};

reactive.Set = <T>(description?: string | DescriptionArgs): Set<T> => {
  return TrackedSet.reactive(Stack.description(description));
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
