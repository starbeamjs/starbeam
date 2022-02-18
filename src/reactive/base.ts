import type { BaseOptions } from "jsdom";
import { HasMetadata } from "../core/metadata.js";
import type { IS_UPDATED_SINCE } from "../fundamental/constants.js";
import type * as types from "../fundamental/types.js";
import type { Timestamp } from "../universe.js";

let ID = 0;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class ExtendsReactive<T>
  extends HasMetadata
  implements types.Reactive<T>
{
  readonly id = ID++;

  abstract get current(): T;
  abstract get description(): string;
}

export type ReactiveValue<R extends types.Reactive<unknown>> =
  R extends types.Reactive<infer Value> ? Value : never;

export type IntoReactive<T> = types.Reactive<T> | T;

export type StaticReactive<T> = types.Reactive<T> & {
  metadata: {
    isStatic: true;
  };
};

export type DynamicReactive<T> = types.Reactive<T> & {
  metadata: {
    isStatic: false;
  };
};

export type AnyReactive = types.Reactive<unknown>;
