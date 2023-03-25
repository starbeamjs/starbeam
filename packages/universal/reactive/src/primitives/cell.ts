import { readonly } from "@starbeam/core-utils";
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
    { description, equals = Object.is }: CellOptions<T> = {}
  ): CellImpl<T> => {
    return new CellImpl(value, equals, Desc("static", description));
  };

  #value: T;
  readonly #equals: Equality<T>;
  declare readonly [TAG]: interfaces.CellTag;

  private constructor(
    value: T,
    equality: Equality<T>,
    description: Debug.Description
  ) {
    this.#value = value;
    this.#equals = equality;
    readonly(this, TAG, CellTag.create(description));
  }

  get current(): T {
    return this.read(getRuntime().callerStack());
  }

  set current(value: T) {
    this.set(value, getRuntime().callerStack());
  }

  read(caller = getRuntime().callerStack()): T {
    getRuntime().didConsumeCell(this, caller);
    return this.#value;
  }

  set(value: T, caller = getRuntime().callerStack()) {
    if (this.#equals(value, this.#value)) {
      return false;
    }

    this.#value = value;
    this[TAG].update({ stack: caller, runtime: getRuntime() });
  }

  update(updater: (prev: T) => T, caller = getRuntime().callerStack()) {
    this.set(updater(this.#value), caller);
  }

  freeze(): void {
    this[TAG].freeze();
  }
}

export const Cell = CellImpl.create;
export type Cell<T = unknown> = CellImpl<T>;

export type Equality<T> = (a: T, b: T) => boolean;

export interface CellOptions<T> extends PrimitiveOptions {
  equals?: Equality<T>;
}
