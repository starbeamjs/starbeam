import { Desc, type Description } from "@starbeam/debug";
import type { ReactiveValue, Tag } from "@starbeam/interfaces";
import type * as interfaces from "@starbeam/interfaces";
import type { ResourceBlueprint } from "@starbeam/resource";
import { isObject } from "@starbeam/verify";

export type ReactiveFactory<T> =
  | (() => T)
  | (new () => T)
  | ReactiveBlueprint<T>;

export function Reactive<T>(
  this: void,
  constructor: ReactiveFactory<T>,
  description?: string | Description
): ReactiveBlueprint<T> {
  const desc = Desc("blueprint:reactive", description);
  return new ReactiveBlueprint(constructor, desc);
}

export type IntoReactive<T> = interfaces.Reactive<T> | T;

export type TypedReactive<T, I extends Tag = Tag> = ReactiveValue<T, I>;

export type Reactive<T> = interfaces.Reactive<T>;

export class ReactiveBlueprint<T> {
  static is<T>(value: T | ReactiveBlueprint<T>): value is ReactiveBlueprint<T> {
    return isObject(value) && value instanceof ReactiveBlueprint;
  }

  readonly #create: ReactiveFactory<T>;
  readonly #description: Description;

  constructor(create: ReactiveFactory<T>, description: Description) {
    this.#create = create;
    this.#description = description;
  }

  create(_owner?: object): T {
    const value = construct(this.#create) as T | ReactiveBlueprint<T>;

    if (ReactiveBlueprint.is(value)) {
      return value.create();
    } else {
      return value;
    }
  }

  isResource(): this is ResourceBlueprint<T> {
    return false;
  }
}

function construct<T>(constructor: ReactiveFactory<T>): T | Reactive<T> {
  try {
    return (constructor as () => T | Reactive<T>)();
  } catch {
    return new (constructor as new () => T)();
  }
}

export type Blueprint<T> = ResourceBlueprint<T> | ReactiveBlueprint<T>;
