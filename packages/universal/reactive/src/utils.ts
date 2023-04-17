import type {
  CallStack,
  Description,
  Reactive,
  Tagged,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { Static } from "./primitives/cell.js";
import { DEBUG } from "./runtime.js";

function is(this: void, value: unknown): value is Tagged {
  return !!(
    value &&
    (typeof value === "object" || typeof value === "function") &&
    TAG in value
  );
}

export const isTagged = is;

export function isReactive<T>(
  this: void,
  value: unknown
): value is Reactive<T> {
  return is(value) && hasRead(value);
}

export type ReadValue<T> = T extends Reactive<infer R> ? R : T;

export function read<T>(
  this: void,
  value: T,
  caller = DEBUG.callerStack?.()
): ReadValue<T> {
  if (is(value) && hasRead(value)) {
    return value.read(caller) as ReadValue<T>;
  } else {
    return value as ReadValue<T>;
  }
}

export function intoReactive<T>(
  this: void,
  value: T | Reactive<T>,
  description?: string | Description | undefined
): Reactive<T> {
  if (isReactive(value)) {
    return value;
  } else {
    return Static(value, {
      description: DEBUG.Desc?.("cell", description),
    });
  }
}

function hasRead<T>(
  value: object
): value is { read: (caller?: CallStack) => T } {
  return "read" in value && typeof value.read === "function";
}
