import { isObject } from "../utils.js";
import { REACTIVE_BRAND } from "./internal.js";
import { HasMetadata } from "./metadata.js";
import { Static } from "./static.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class AbstractReactive<T> extends HasMetadata {
  static from<T>(reactive: IntoReactive<T>): AbstractReactive<T> {
    if (AbstractReactive.is(reactive)) {
      return reactive;
    } else {
      return new Static(reactive);
    }
  }

  static is<T>(
    reactive: unknown | AbstractReactive<T>
  ): reactive is AbstractReactive<T> {
    return isObject(reactive) && REACTIVE_BRAND.is(reactive);
  }

  abstract get current(): T;
  abstract get description(): string;
}

export type Reactive<T = unknown> = AbstractReactive<T>;

export type ReactiveValue<R extends AbstractReactive<unknown>> =
  R extends AbstractReactive<infer Value> ? Value : never;

export type IntoReactive<T> = AbstractReactive<T> | T;

export type StaticReactive<T> = AbstractReactive<T> & {
  metadata: {
    isStatic: true;
  };
};

export type DynamicReactive<T> = AbstractReactive<T> & {
  metadata: {
    isStatic: false;
  };
};

export type AnyReactive = AbstractReactive<unknown>;
