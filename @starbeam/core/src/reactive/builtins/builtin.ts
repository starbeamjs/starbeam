import { Abstraction } from "@starbeam/debug";
import type { AnyRecord } from "@starbeam/fundamental";
import { Cell, Memo, type Reactive } from "@starbeam/reactive";
import type { FIXME } from "../../utils.js";
import { TrackedArray } from "./array.js";
import { TrackedMap, TrackedWeakMap } from "./map.js";
import TrackedObject from "./object.js";
import { TrackedSet, TrackedWeakSet } from "./set.js";

export type Builtin =
  | Map<unknown, unknown>
  | Set<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>;

type Primitive = string | number | boolean | symbol | bigint | null | undefined;

const PRIMITIVE = [
  "  - a string",
  "  - a number",
  "  - a boolean",
  "  - a symbol",
  "  - a bigint",
  "  - null",
  "  - undefined",
];

const OPTIONS = [
  "- an array literal",
  "- an object literal",
  "- Map",
  "- Set",
  "- WeakMap",
  "- WeakSet",
  "- a primitive (to create a cell)",
  ...PRIMITIVE,
].join("\n");

type CoercibleIntoReactiveObject = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in keyof any]: CoercibleIntoReactive;
};

type CoerceReactiveObject<O extends CoercibleIntoReactiveObject> = {
  readonly [P in keyof O]: CoerceReactive<O[P]>;
};

type BuiltinConstructor =  // the Map constructor is coerced into an instance of TrackedMap
  | typeof Map
  // the Set constructor is coerced into an instance of TrackedSet
  | typeof Set
  // the WeakMap constructor is coerced into an instance of TrackedWeakMap
  | typeof WeakMap
  // the WeakSet constructor is coerced into an instance of TrackedWeakSet
  | typeof WeakSet;

type CoercibleIntoReactive =
  // A Reactive can, of course, be coerced into a Reactive
  | Reactive<unknown>
  // A zero-arity function is coerced into a memo
  | (() => unknown)
  | unknown[]
  | BuiltinConstructor
  | CoercibleIntoReactiveObject;

type ConstructBuiltin<B extends BuiltinConstructor> =
  InstanceType<B> extends infer I ? I : never;

type CoerceBuiltin<B extends BuiltinConstructor> = B extends typeof Map
  ? ConstructBuiltin<typeof Map>
  : B extends typeof Set
  ? ConstructBuiltin<typeof Set>
  : B extends typeof WeakMap
  ? ConstructBuiltin<typeof WeakMap>
  : B extends typeof WeakSet
  ? ConstructBuiltin<typeof WeakSet>
  : never;

type CoerceReactive<R extends CoercibleIntoReactive> = R extends Reactive<any>
  ? R
  : R extends (infer T)[]
  ? T[]
  : R extends () => infer T
  ? Reactive<T>
  : R extends BuiltinConstructor
  ? CoerceBuiltin<R>
  : R extends CoercibleIntoReactiveObject
  ? CoerceReactiveObject<R>
  : never;

export interface BuiltinDescription {
  readonly as: string;
}

export function builtin<K, V>(
  value: typeof Map,
  description?: BuiltinDescription
): Map<K, V>;
export function builtin<V>(
  value: typeof Set,
  description?: BuiltinDescription
): Set<V>;
export function builtin<K extends object, V>(
  value: typeof WeakMap,
  description?: BuiltinDescription
): WeakMap<K, V>;
export function builtin<V extends object>(
  value: typeof WeakSet,
  description?: BuiltinDescription
): WeakSet<V>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function builtin<M extends () => any>(
  callback: M,
  description?: BuiltinDescription
): M extends () => infer T ? Reactive<T> : never;
export function builtin<T extends Primitive>(
  value: T,
  description?: BuiltinDescription
): Cell<T>;
export function builtin<T extends Record<string, unknown>>(
  object: T,
  description?: BuiltinDescription
): T;
export function builtin<T>(value: T[], description?: BuiltinDescription): T[];
export function builtin<R extends AnyRecord>(
  value: R,
  description?: BuiltinDescription
): R;
export function builtin(
  value: unknown,
  desc: BuiltinDescription = { as: Abstraction.callerFrame() }
): unknown {
  const description = desc.as;

  if (Array.isArray(value)) {
    // freeze the array to prevent mutating it directly and expecting to see updates
    Object.freeze(value);
    return TrackedArray.from(value);
  } else if (value === Map) {
    return new TrackedMap();
  } else if (value === Set) {
    return new TrackedSet();
  } else if (value === WeakMap) {
    return new TrackedWeakMap();
  } else if (value === WeakSet) {
    return new TrackedWeakSet();
  } else if (typeof value === "function") {
    return Memo(value as FIXME, description);
  } else if (isSimpleObject(value)) {
    // freeze the object to prevent mutating it directly and expecting to see updates
    Object.freeze(value);
    return TrackedObject.fromEntries(Object.entries(value));
  } else if (isPrimitive(value)) {
    return Cell(value, description);
  } else {
    console.trace(`you passed`, value);
    throw new Error(`You must call reactive() with:\n\n${OPTIONS}`);
  }
}

function isPrimitive(value: unknown): value is Primitive {
  if (value === null) {
    return true;
  }

  return typeof value !== "object" && typeof value !== "function";
}

function isSimpleObject(value: unknown): value is object {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  let proto: null | object = Object.getPrototypeOf(value);

  return proto === null || proto === Object.prototype;
}
