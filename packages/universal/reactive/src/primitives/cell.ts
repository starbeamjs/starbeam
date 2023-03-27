import { readonly } from "@starbeam/core-utils";
import type * as Debug from "@starbeam/debug";
import { Desc } from "@starbeam/debug";
import type {
  CellTag as ICellTag,
  Expand,
  ReactiveCell,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { CellTag } from "@starbeam/tags";

import { getRuntime } from "../runtime.js";
import {
  type DescriptionOption,
  isDescriptionOption,
  type PrimitiveOptions,
} from "./utils.js";

export class CellImpl<T> implements ReactiveCell<T> {
  static create = <T>(
    value: T,
    options?: CellOptions<T> | DescriptionOption
  ): CellImpl<T> => {
    const { description, equals = Object.is } = toCellOptions(options);
    return new CellImpl(value, equals, Desc("cell", description));
  };

  #value: T;
  readonly #equals: Equality<T>;
  declare readonly [TAG]: ICellTag;

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

  read(_caller = getRuntime().callerStack()): T {
    getRuntime().autotracking.consume(this[TAG]);
    return this.#value;
  }

  set(value: T, caller = getRuntime().callerStack()) {
    if (this.#equals(value, this.#value)) {
      return false;
    }

    this.#value = value;
    this[TAG].update({ caller, runtime: getRuntime() });
  }

  update(updater: (prev: T) => T, caller = getRuntime().callerStack()) {
    this.set(updater(this.#value), caller);
  }

  freeze(): void {
    this[TAG].freeze();
  }
}

export const Cell = CellImpl.create;
export type Cell<T = unknown> = Expand<CellImpl<T>>;

export type Equality<T> = (a: T, b: T) => boolean;

export interface CellOptions<T> extends PrimitiveOptions {
  equals?: Equality<T>;
}

export function toCellOptions<T>(
  options: CellOptions<T> | DescriptionOption
): CellOptions<T> {
  return isDescriptionOption(options) ? { description: options } : options;
}
