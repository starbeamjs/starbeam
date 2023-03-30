import type * as Debug from "@starbeam/debug";
import { callerStack, Desc } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type { TagType } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { Static } from "./primitives/static.js";

export type Reactive<T> = interfaces.Reactive<T>;

function is<T>(
  this: void,
  value: T | interfaces.Reactive<T>
): value is interfaces.Reactive<T> {
  return !!(
    value &&
    (typeof value === "object" || typeof value === "function") &&
    TAG in value
  );
}

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

export function read<T>(
  this: void,
  value: T | Reactive<T>,
  caller = callerStack()
): T {
  if (is(value) && hasRead(value)) {
    return value.read(caller);
  } else {
    return value;
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

function hasRead<T>(value: object): value is { read: () => T } {
  return "read" in value && typeof value.read === "function";
}
