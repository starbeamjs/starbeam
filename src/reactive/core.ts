import { isObject } from "../utils";
import { REACTIVE_BRAND } from "./internal";
import { Static } from "./static";

export interface ReactiveMetadata {
  readonly isStatic: boolean;
}

export interface Reactive<T> {
  readonly current: T;
  readonly metadata: ReactiveMetadata;
}

export type ReactiveValue<R extends Reactive<unknown>> = R extends Reactive<
  infer R
>
  ? R
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

export const Reactive = {
  from<T>(reactive: IntoReactive<T>): Reactive<T> {
    if (Reactive.isReactive(reactive)) {
      return reactive;
    } else {
      return new Static(reactive);
    }
  },

  isReactive<T>(reactive: unknown | Reactive<T>): reactive is Reactive<T> {
    return isObject(reactive) && REACTIVE_BRAND.is(reactive);
  },

  isStatic<T>(reactive: Reactive<T>): reactive is StaticReactive<T> {
    return reactive.metadata.isStatic;
  },

  isDynamic<T>(reactive: Reactive<T>): reactive is DynamicReactive<T> {
    return !Reactive.isStatic(reactive);
  },
} as const;
