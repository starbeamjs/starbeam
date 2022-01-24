import { isObject } from "../utils";
import { REACTIVE_BRAND } from "./internal";
import { HasMetadata } from "./metadata";
import { Static } from "./static";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class Reactive<T> extends HasMetadata {
  static from<T>(reactive: IntoReactive<T>): Reactive<T> {
    if (Reactive.is(reactive)) {
      return reactive;
    } else {
      return new Static(reactive);
    }
  }

  static is<T>(reactive: unknown | Reactive<T>): reactive is Reactive<T> {
    return isObject(reactive) && REACTIVE_BRAND.is(reactive);
  }
}

export interface Reactive<T> {
  readonly current: T;
}

export type ReactiveValue<R extends Reactive<unknown>> = R extends Reactive<
  infer Value
>
  ? Value
  : never;

export type IntoReactive<T> = Reactive<T> | T;

export type StaticReactive<T> = Reactive<T> & {
  metadata: {
    isStatic: true;
  };
};

export type DynamicReactive<T> = Reactive<T> & {
  metadata: {
    isStatic: false;
  };
};

export type AnyReactive = Reactive<unknown>;
