import type { Reactive } from "../../fundamental/types.js";
import { Abstraction } from "../../index.js";
import type { AnyRecord } from "../../../trace-internals/src/wrapper.js";
import type { FIXME } from "../../utils.js";
import { Cell } from "../cell.js";
import { ReactiveMemo } from "../memo.js";
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

type CoerceReactive<R extends CoercibleIntoReactive> = R extends Reactive
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

export function builtin<K, V>(value: typeof Map): Map<K, V>;
export function builtin<V>(value: typeof Set): Set<V>;
export function builtin<K extends object, V>(
  value: typeof WeakMap
): WeakMap<K, V>;
export function builtin<V extends object>(value: typeof WeakSet): WeakSet<V>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function builtin<M extends () => any>(
  callback: M
): M extends () => infer T ? Reactive<T> : never;
export function builtin<T extends Primitive>(value: T): Cell<T>;
export function builtin<T extends Record<string, unknown>>(object: T): T;
export function builtin<T>(value: T[]): T[];
export function builtin<R extends AnyRecord>(value: R): R;
export function builtin(value: unknown): unknown {
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
    return ReactiveMemo.create(value as FIXME, Abstraction.callerFrame());
  } else if (isSimpleObject(value)) {
    // freeze the object to prevent mutating it directly and expecting to see updates
    Object.freeze(value);
    return TrackedObject.fromEntries(Object.entries(value));
  } else if (isPrimitive(value)) {
    return Cell(value);
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
