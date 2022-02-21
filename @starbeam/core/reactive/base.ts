import { HasMetadata } from "../core/metadata.js";
import type { UNINITIALIZED } from "../fundamental/constants.js";
import type { Cell, Reactive as ReactiveType } from "../fundamental/types.js";

let ID = 0;

export interface InspectReactive {
  name: string;
  description: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class ExtendsReactive<T>
  extends HasMetadata
  implements ReactiveType<T>
{
  readonly #id = ID++;
  readonly #inspect: InspectReactive & { id: number };

  constructor(inspect: InspectReactive) {
    super();

    this.#inspect = { ...inspect, id: this.#id };

    Object.defineProperty(this, inspect.name, {
      enumerable: true,
      configurable: true,
      writable: false,
      value: this.#id,
    });

    Object.defineProperty(this, "at", {
      enumerable: true,
      configurable: true,
      writable: false,
      value: this.#inspect.description,
    });

    Object.defineProperty(this, "compute", {
      enumerable: true,
      configurable: true,
      get(this: ExtendsReactive<T>): T {
        return this.current;
      },
    });
  }

  abstract get current(): T;
  abstract get description(): string;
  abstract get cells(): UNINITIALIZED | readonly Cell[];

  toString() {
    return `(${this.#id}) ${this.#inspect.name} (${
      this.#inspect.description
    }) `;
  }
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
