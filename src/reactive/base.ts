import { HasMetadata } from "../core/metadata.js";
import type { UNINITIALIZED } from "../fundamental/constants.js";
import type { Cell, Reactive as ReactiveType } from "../fundamental/types.js";

let ID = 0;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class ExtendsReactive<T>
  extends HasMetadata
  implements ReactiveType<T>
{
  readonly id = ID++;

  abstract get current(): T;
  abstract get description(): string;
  abstract get cells(): UNINITIALIZED | readonly Cell[];
}

export type ReactiveValue<R extends ReactiveType<unknown>> =
  R extends ReactiveType<infer Value> ? Value : never;

export type IntoReactive<T> = ReactiveType<T> | T;

export type StaticReactive<T> = ReactiveType<T> & {
  metadata: {
    isStatic: true;
  };
};

export type DynamicReactive<T> = ReactiveType<T> & {
  metadata: {
    isStatic: false;
  };
};

export type AnyReactive = ReactiveType<unknown>;
