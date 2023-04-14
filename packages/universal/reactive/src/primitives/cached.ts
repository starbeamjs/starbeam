import { TAG } from "@starbeam/shared";
import { createFormulaTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
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
  const desc = RUNTIME.debug?.desc("formula", description);

  let last: Last<T> | null = null;

  const tag = createFormulaTag(desc, () =>
    last === null ? new Set() : last.formula.children()
  );

  function evaluate(): T {
    if (last === null) {
      const lifecycle = FormulaLifecycle();
      const value = compute();
      const formula = lifecycle.done();

      last = { formula, value };

      tag.markInitialized();
      RUNTIME.subscriptions.update(tag);

      return value;
    } else if (last.formula.isStale()) {
      const lifecycle = last.formula.update();
      const value = (last.value = compute());
      lifecycle.done();
      RUNTIME.subscriptions.update(tag);

      // last.value = value;
      return value;
    } else {
      return last.value;
    }
  }

  function read(_caller = RUNTIME.callerStack?.()): T {
    const value = evaluate();
    RUNTIME.autotracking.consume(tag);
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

interface Last<T> {
  readonly formula: FinalizedFormula;
  value: T;
}
