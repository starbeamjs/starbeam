import type { Reactive } from "../core";
import TrackedArray from "./array";
import { TrackedMap } from "./map";
import type { ObjectType } from "./type-magic";

export function reactive<M extends Map<unknown, unknown>>(map: M): M;
export function reactive<T>(
  array: readonly T[]
): `it doesn't make sense to turn a readonly array into a reactive array`;
export function reactive<T>(array: T[]): T[];
export function reactive<O extends ObjectType>(object: O): O;
export function reactive<T>(
  callback: () => T,
  description?: string
): Reactive<T>;
export function reactive(value: object): unknown {
  if (Array.isArray(value)) {
    return TrackedArray.from(value);
  } else if (value instanceof Map) {
    return TrackedMap.reactive(value);
  }
  throw Error("todo: generic reactive");
}
