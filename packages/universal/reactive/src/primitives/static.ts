import type * as Debug from "@starbeam/debug";
import { Desc } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { StaticTag } from "@starbeam/tags";

import type { PrimitiveOptions } from "./shared.js";

export class StaticImpl<T>
  implements interfaces.ReactiveValue<T, interfaces.StaticTag>
{
  static create = <T>(
    value: T,
    { description }: PrimitiveOptions = {}
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
