import { readonly } from "@starbeam/core-utils";
import type {
  CellTag as ICellTag,
  Description,
  ReactiveCell,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createCellTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import {
  type DescriptionOption,
  isDescriptionOption,
  type PrimitiveOptions,
} from "./utils.js";

export class CellImpl<T> implements ReactiveCell<T> {
  static create = <T>(
    value: T,
    options?: CellOptions<T> | DescriptionOption
  ): Cell<T> => {
    const { description, equals = Object.is } = toCellOptions(options);
    return new CellImpl(value, equals, RUNTIME.Desc?.("cell", description));
  };

  #value: T;
  readonly #equals: Equality<T>;
  declare readonly [TAG]: ICellTag;

  private constructor(
    value: T,
    equality: Equality<T>,
    description: Description | undefined
  ) {
    this.#value = value;
    this.#equals = equality;
    readonly(this, TAG, createCellTag(description));
  }

  get current(): T {
    return this.read(RUNTIME.callerStack?.());
  }

  set current(value: T) {
    this.set(value, RUNTIME.callerStack?.());
  }

  read(_caller = RUNTIME.callerStack?.()): T {
    RUNTIME.autotracking.consume(this[TAG]);
    return this.#value;
  }

  set(value: T, caller = RUNTIME.callerStack?.()): boolean {
    if (this.#equals(value, this.#value)) {
      return false;
    }

    this.#value = value;
    this[TAG].update({ caller, runtime: RUNTIME });
    return true;
  }

  update(updater: (prev: T) => T, caller = RUNTIME.callerStack?.()) {
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

export function toCellOptions<T>(
  options: CellOptions<T> | DescriptionOption
): CellOptions<T> {
  return isDescriptionOption(options) ? { description: options } : options;
}
