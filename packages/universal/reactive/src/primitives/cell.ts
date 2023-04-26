import type {
  CallStack,
  CellTag,
  Description,
  TaggedReactive,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createCellTag, zero } from "@starbeam/tags";

import { getDebug, getRuntime } from "../runtime.js";
import {
  isDescriptionOption,
  type PrimitiveOptions,
  type SugaryPrimitiveOptions,
  toOptions,
} from "./utils.js";

export interface Cell<T = unknown> extends TaggedReactive<T, CellTag> {
  current: T;
  /**
   * Set the value of the cell. Returns true if the value was changed, false if
   * the current value was equivalent to the new value.
   */
  set: (value: T, caller?: CallStack) => boolean;
  update: (fn: (value: T) => T, caller?: CallStack) => void;
  freeze: () => void;
}

export type Static<T> = TaggedReactive<T, CellTag & { dependencies: () => [] }>;

export function Static<T>(
  value: T,
  options?: SugaryPrimitiveOptions
): TaggedReactive<T, CellTag> {
  const { description } = toOptions(options);
  const desc = getDebug()?.Desc("formula", description);

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
  const desc = getDebug()?.Desc("cell", description);
  const { tag, mark, freeze } = createCellTag(desc);

  const set = (newValue: T, _caller = getDebug()?.callerStack()): boolean => {
    if (equals(value, newValue)) return false;

    value = newValue;
    getRuntime().mark(tag, mark);
    return true;
  };

  const update = (
    updater: (prev: T) => T,
    caller = getDebug()?.callerStack()
  ) => set(updater(value), caller);

  const read = (_caller = getDebug()?.callerStack()): T => {
    getRuntime().consume(tag);
    return value;
  };

  return {
    [TAG]: tag,
    get current(): T {
      return read(getDebug()?.callerStack());
    },
    set current(value: T) {
      set(value, getDebug()?.callerStack());
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
