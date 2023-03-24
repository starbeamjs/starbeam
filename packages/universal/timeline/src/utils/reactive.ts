import type * as Debug from "@starbeam/debug";
import { callerStack, Desc } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { StaticTag } from "@starbeam/tags";

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
    return Static(value, Desc("static", description));
  }
}

function hasRead<T>(value: object): value is { read: () => T } {
  return "read" in value && typeof value.read === "function";
}

export class StaticImpl<T>
  implements interfaces.ReactiveValue<T, interfaces.StaticTag>
{
  static create = <T>(
    value: T,
    description?: string | Debug.Description
  ): StaticImpl<T> => {
    return new StaticImpl(value, Desc("static", description));
  };

  readonly #value: T;
  readonly [TAG]: interfaces.StaticTag;

  private constructor(value: T, description: Debug.Description) {
    this.#value = value;
    this[TAG] = StaticTag.create(description);
  }

  get current(): T {
    return this.#value;
  }

  read(): T {
    return this.#value;
  }
}

export const Static = StaticImpl.create;
export type Static<T> = StaticImpl<T>;
