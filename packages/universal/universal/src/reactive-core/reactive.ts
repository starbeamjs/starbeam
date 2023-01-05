import { type Description, Desc } from "@starbeam/debug";
import type { ReactiveInternals } from "@starbeam/interfaces";
import { Reactive as TimelineReactive } from "@starbeam/timeline";
import { isObject } from "@starbeam/verify";

import type { ResourceBlueprint } from "./resource/resource.js";

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

Reactive.is = TimelineReactive.is;
Reactive.from = TimelineReactive.from;

Reactive.read = <T>(value: IntoReactive<T>): T => {
  if (Reactive.is(value)) {
    return value.current;
  } else {
    return value;
  }
};

export type IntoReactive<T> = Reactive<T> | T;

export type TypedReactive<
  T,
  I extends ReactiveInternals = ReactiveInternals
> = TimelineReactive<T, I>;

export type Reactive<T> = TimelineReactive<T>;

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

export type Blueprint<T, Default extends undefined = never> =
  | ResourceBlueprint<T, Default>
  | ReactiveBlueprint<T>;
