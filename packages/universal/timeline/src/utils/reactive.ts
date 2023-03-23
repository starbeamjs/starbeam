import type * as Debug from "@starbeam/debug";
import { Desc } from "@starbeam/debug";
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

export const Reactive = {
  is<T>(this: void, value: unknown): value is interfaces.Reactive<T> {
    return is(value) && hasRead(value);
  },

  from<T>(
    this: void,
    value: T | Reactive<T>,
    description?: string | Debug.Description
  ): Reactive<T> {
    if (Reactive.is(value)) {
      return value;
    } else {
      return new Static(value, Desc("static", description));
    }
  },
};

function hasRead<T>(value: object): value is { read: () => T } {
  return "read" in value && typeof value.read === "function";
}

class Static<T> implements interfaces.ReactiveValue<T, interfaces.StaticTag> {
  readonly #value: T;
  readonly [TAG]: interfaces.StaticTag;

  constructor(value: T, description: Debug.Description) {
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
