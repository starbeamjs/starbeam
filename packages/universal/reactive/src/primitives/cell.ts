import type {
  CallStack,
  CellTag,
  Description,
  ReactiveValue,
  TaggedReactive,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createCellTag, zero } from "@starbeam/tags";

import { DEBUG, RUNTIME } from "../runtime.js";
import {
  isDescriptionOption,
  type PrimitiveOptions,
  type SugaryPrimitiveOptions,
  toOptions,
} from "./utils.js";

export interface Cell<T = unknown> extends ReactiveValue<T, CellTag> {
  current: T;
  /**
   * Set the value of the cell. Returns true if the value was changed, false if
   * the current value was equivalent to the new value.
   */
  set: (value: T, caller?: CallStack) => boolean;
  update: (fn: (value: T) => T, caller?: CallStack) => void;
  freeze: () => void;
}

export function Static<T>(
  value: T,
  options?: SugaryPrimitiveOptions
): TaggedReactive<CellTag, T> {
  const { description } = toOptions(options);
  const desc = RUNTIME.debug?.desc("formula", description);

  return {
    read: () => value,
    current: value,
    [TAG]: {
      type: "cell",
      description: desc,
      dependencies: () => [],
      lastUpdated: zero(),
    } satisfies CellTag,
  };
}

export function Cell<T>(
  value: T,
  options?: CellOptions<T> | string | Description | undefined
): Cell<T> {
  const { description, equals = Object.is } = toCellOptions(options);
  const desc = DEBUG.Desc?.("cell", description);
  const { tag, mark, freeze } = createCellTag(desc);

  const set = (newValue: T, _caller = DEBUG.callerStack?.()): boolean => {
    if (equals(value, newValue)) return false;

    value = newValue;
    RUNTIME.mark(tag, mark);
    return true;
  };

  const update = (updater: (prev: T) => T, caller = DEBUG.callerStack?.()) =>
    set(updater(value), caller);

  const read = (_caller = DEBUG.callerStack?.()): T => {
    RUNTIME.consume(tag);
    return value;
  };

  return {
    [TAG]: tag,
    get current(): T {
      return read(DEBUG.callerStack?.());
    },
    set current(value: T) {
      set(value, DEBUG.callerStack?.());
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

function toCellOptions<T>(
  options: CellOptions<T> | Description | string | undefined
): CellOptions<T> {
  return isDescriptionOption(options) ? { description: options } : options;
}
