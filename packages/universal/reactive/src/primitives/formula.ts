import type {
  FormulaTag,
  Tag,
  TaggedReactive,
  TagSnapshot,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createFormulaTag } from "@starbeam/tags";

import { getDebug, getRuntime } from "../runtime.js";
import type { FormulaFn, SugaryPrimitiveOptions } from "./utils.js";
import { toOptions, WrapFn } from "./utils.js";

export interface Formula<T = unknown> extends TaggedReactive<T, FormulaTag> {
  (): T;
  readonly current: T;
}

export function Formula<T>(
  compute: () => T,
  options?: SugaryPrimitiveOptions,
): FormulaFn<T> {
  const { description } = toOptions(options);
  const desc = getDebug()?.Desc("formula", description);
  let children = new Set<Tag>();
  const { tag, markInitialized } = createFormulaTag(desc, () => children);

  function read(_caller = getDebug()?.callerStack()): T {
    const { value, tags } = evaluate(compute);
    children = tags as Set<Tag>;

    markInitialized();
    getRuntime().update(tag);
    getRuntime().consume(tag);

    return value;
  }

  return WrapFn({
    [TAG]: tag,
    read,
    get current(): T {
      return read(getDebug()?.callerStack());
    },
  });
}

function evaluate<T>(compute: () => T): { value: T; tags: TagSnapshot } {
  const done = getRuntime().start();
  const value = compute();
  const tags = done();
  return { value, tags };
}
