import type * as Debug from "@starbeam/debug";
import { callerStack, Desc } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type { TagType } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { Static } from "./primitives/static.js";

export type Reactive<T> = interfaces.Reactive<T>;

function is(this: void, value: unknown): value is interfaces.Tagged {
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

export function isTaggedReactive<T, Type extends TagType>(
  this: void,
  value: unknown,
  tag: Type
): value is interfaces.TaggedReactive<interfaces.SpecificTag<Type>, T> {
  return is(value) && value[TAG].type === tag && hasRead(value);
}

export type ReadValue<T> = T extends Reactive<infer R> ? R : T;

export function read<T>(
  this: void,
  value: T,
  caller = callerStack()
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
  description?: string | Debug.Description
): Reactive<T> {
  if (isReactive(value)) {
    return value;
  } else {
    return Static(value, { description: Desc("static", description) });
  }
}

function hasRead<T>(
  value: object
): value is { read: (caller?: interfaces.CallStack) => T } {
  return "read" in value && typeof value.read === "function";
}
