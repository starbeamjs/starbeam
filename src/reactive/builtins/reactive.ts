import type { AnyRecord } from "../../strippable/wrapper.js";
import { Cell } from "../cell.js";
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

export function builtin<K, V>(value: typeof Map): Map<K, V>;
export function builtin<V>(value: typeof Set): Set<V>;
export function builtin<K extends object, V>(
  value: typeof WeakMap
): WeakMap<K, V>;
export function builtin<V extends object>(value: typeof WeakSet): WeakSet<V>;
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
  } else if (isSimpleObject(value)) {
    // freeze the object to prevent mutating it directly and expecting to see updates
    Object.freeze(value);
    return TrackedObject.fromEntries(Object.entries(value));
  } else if (isPrimitive(value)) {
    return Cell(value);
  } else if (typeof value === "function") {
    throw Error("todo: todo: reactive(() => ...)");
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
