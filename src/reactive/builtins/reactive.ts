import type { ObjectType } from "./type-magic";

type ReactiveReadyBuiltins =
  | unknown[]
  | readonly unknown[]
  | Record<PropertyKey, unknown>
  | Map<unknown, unknown>
  | Set<unknown>
  | WeakMap<object, unknown>;

export function reactive<T>(
  array: readonly T[]
): `it doesn't make sense to turn a readonly array into a reactive array`;
export function reactive<T>(array: T[]): T[];
export function reactive<O extends ObjectType>(object: O): O;
export function reactive(value: unknown): unknown {
  throw Error("todo: generic reactive");
}
