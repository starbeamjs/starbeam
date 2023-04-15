import type {
  CoreFormulaTag,
  CoreTag,
  ReactiveValue,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createFormulaTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import {
  type FormulaFn,
  type SugaryPrimitiveOptions,
  toOptions,
  WrapFn,
} from "./utils.js";

export interface Formula<T = unknown> extends ReactiveValue<T, CoreFormulaTag> {
  (): T;
  readonly current: T;
}

export function Formula<T>(
  compute: () => T,
  options?: SugaryPrimitiveOptions
): FormulaFn<T> {
  const { description } = toOptions(options);
  const desc = RUNTIME.Desc?.("formula", description);
  let children = new Set<CoreTag>();
  const tag = createFormulaTag(desc, () => children);

  function read(_caller = RUNTIME.callerStack?.()): T {
    const { value, tags } = RUNTIME.evaluate(compute);
    children = tags;

    tag.markInitialized();
    RUNTIME.subscriptions.update(tag);

    return value;
  }

  return WrapFn({
    [TAG]: tag,
    read,
    get current(): T {
      return read(RUNTIME.callerStack?.());
    },
  });
}
