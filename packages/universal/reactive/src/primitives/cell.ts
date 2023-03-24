import type * as Debug from "@starbeam/debug";
import { Desc } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { CellTag } from "@starbeam/tags";

import { getRuntime } from "../runtime.js";
import type { PrimitiveOptions } from "./shared.js";

export class CellImpl<T>
  implements interfaces.ReactiveValue<T, interfaces.CellTag>
{
  static create = <T>(
    value: T,
    { description }: { description?: string | Debug.Description } = {}
  ): CellImpl<T> => {
    return new CellImpl(value, Desc("static", description));
  };

  readonly #value: T;
  readonly [TAG]: interfaces.CellTag;

  private constructor(value: T, description: Debug.Description) {
    this.#value = value;
    this[TAG] = CellTag.create(description);
  }

  get current(): T {
    return this.#value;
  }

  read(caller = getRuntime().callerStack()): T {
    getRuntime().didConsumeCell(this, caller);
    return this.#value;
  }
}

export const Cell = CellImpl.create;
export type Cell<T> = CellImpl<T>;

export type Equality<T> = (a: T, b: T) => boolean;

export interface CellOptions extends PrimitiveOptions {
  equals?: Equality<unknown>;
}
