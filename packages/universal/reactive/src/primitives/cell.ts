import type {
  CellTag,
  Description,
  TaggedReactive,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createCellTag, zero } from "@starbeam/tags";

import { DEBUG, getDebug, getRuntime } from "../runtime.js";
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
  set: (value: T) => boolean;
  update: (fn: (value: T) => T) => void;
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

  const set = (newValue: T): boolean => {
    if (equals(value, newValue)) return false;

    DEBUG?.markEntryPoint(["reactive:write", desc, "set"]);

    value = newValue;
    getRuntime().mark(tag, mark);
    return true;
  };

  const update = (updater: (prev: T) => T) => {
    DEBUG?.markEntryPoint(["reactive:write", desc, "update"]);
    return set(updater(value));
  };

  const read = (): T => {
    DEBUG?.markEntryPoint(["reactive:read", desc, "read"]);
    getRuntime().consume(tag);
    return value;
  };

  return {
    [TAG]: tag,
    get current(): T {
      DEBUG?.markEntryPoint(["reactive:read", desc, "current"]);
      return read();
    },
    set current(value: T) {
      DEBUG?.markEntryPoint(["reactive:write", desc, "current"]);
      set(value);
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
