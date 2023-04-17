import type { FormulaTag, ReactiveValue, Tag } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createFormulaTag } from "@starbeam/tags";

import { DEBUG, evaluate, RUNTIME } from "../runtime.js";
import {
  type FormulaFn,
  type SugaryPrimitiveOptions,
  toOptions,
  WrapFn,
} from "./utils.js";

export interface Formula<T = unknown> extends ReactiveValue<T, FormulaTag> {
  (): T;
  readonly current: T;
}

export function Formula<T>(
  compute: () => T,
  options?: SugaryPrimitiveOptions
): FormulaFn<T> {
  const { description } = toOptions(options);
  const desc = DEBUG.Desc?.("formula", description);
  let children = new Set<Tag>();
  const { tag, markInitialized } = createFormulaTag(desc, () => children);

  function read(_caller = DEBUG.callerStack?.()): T {
    const { value, tags } = evaluate(compute);
    children = tags as Set<Tag>;

    markInitialized();
    RUNTIME.update(tag);

    return value;
  }

  return WrapFn({
    [TAG]: tag,
    read,
    get current(): T {
      return read(DEBUG.callerStack?.());
    },
  });
}
