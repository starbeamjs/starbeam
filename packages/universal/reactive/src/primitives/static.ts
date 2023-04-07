import type * as interfaces from "@starbeam/interfaces";
import type { Description } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createStaticTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import type { PrimitiveOptions } from "./utils.js";

export class StaticImpl<T>
  implements interfaces.ReactiveValue<T, interfaces.StaticTag>
{
  static create = <T>(
    value: T,
    { description }: PrimitiveOptions = {}
  ): StaticImpl<T> => {
    return new StaticImpl(value, RUNTIME.Desc?.("static", description));
  };

  readonly #value: T;
  readonly [TAG]: interfaces.StaticTag;

  private constructor(value: T, description: Description | undefined) {
    this.#value = value;
    this[TAG] = createStaticTag(description);
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
