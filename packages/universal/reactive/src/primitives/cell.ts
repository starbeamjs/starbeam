import type { Description, ReactiveCell } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createCellTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import { isDescriptionOption, type PrimitiveOptions } from "./utils.js";

export type Cell<T> = ReactiveCell<T>;

export function Cell<T>(
  value: T,
  options?: CellOptions<T> | string | Description | undefined
): ReactiveCell<T> {
  const { description, equals = Object.is } = toCellOptions(options);
  const desc = RUNTIME.Desc?.("cell", description);
  const tag = createCellTag(desc);

  const set = (newValue: T, caller = RUNTIME.callerStack?.()): boolean => {
    if (equals(value, newValue)) {
      return false;
    }

    value = newValue;
    tag.update({ caller, runtime: RUNTIME });
    return true;
  };

  const update = (updater: (prev: T) => T, caller = RUNTIME.callerStack?.()) =>
    set(updater(value), caller);

  const read = (_caller = RUNTIME.callerStack?.()): T => {
    RUNTIME.autotracking.consume(tag);
    return value;
  };

  const freeze = () => {
    tag.freeze();
  };

  return {
    [TAG]: tag,
    get current(): T {
      return read(RUNTIME.callerStack?.());
    },
    set current(value: T) {
      set(value, RUNTIME.callerStack?.());
    },
    read,
    set,
    update,
    freeze,
  };
}

export type Equality<T> = (a: T, b: T) => boolean;

export interface CellOptions<T> extends PrimitiveOptions {
  equals?: Equality<T>;
}

export function toCellOptions<T>(
  options: CellOptions<T> | Description | string | undefined
): CellOptions<T> {
  return isDescriptionOption(options) ? { description: options } : options;
}
