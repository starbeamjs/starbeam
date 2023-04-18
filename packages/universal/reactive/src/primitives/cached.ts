import { TAG } from "@starbeam/shared";
import { createFormulaTag } from "@starbeam/tags";

import { DEBUG, getRuntime } from "../runtime.js";
import {
  type FinalizedFormula,
  FormulaLifecycle,
} from "./formula-lifecycle.js";
import {
  type FormulaFn,
  type SugaryPrimitiveOptions,
  toOptions,
  WrapFn,
} from "./utils.js";

export function CachedFormula<T>(
  compute: () => T,
  options?: SugaryPrimitiveOptions
): FormulaFn<T> {
  const { description } = toOptions(options);
  const desc = DEBUG?.Desc("formula", description);

  let last: Last<T> | null = null;

  const { tag, markInitialized } = createFormulaTag(desc, () =>
    last === null ? new Set() : last.formula.children()
  );

  function evaluate(): T {
    if (last === null) {
      const lifecycle = FormulaLifecycle();
      const value = compute();
      const formula = lifecycle.done();

      last = { formula, value };

      markInitialized();
      getRuntime().update(tag);
    } else if (last.formula.isStale()) {
      const lifecycle = last.formula.update();
      last.value = compute();
      lifecycle.done();
      getRuntime().update(tag);
    }

    return last.value;
  }

  function read(_caller = DEBUG?.callerStack()): T {
    const value = evaluate();
    getRuntime().consume(tag);
    return value;
  }

  return WrapFn({
    [TAG]: tag,
    read,
    get current(): T {
      return read(DEBUG?.callerStack());
    },
  });
}

interface Last<T> {
  readonly formula: FinalizedFormula;
  value: T;
}
