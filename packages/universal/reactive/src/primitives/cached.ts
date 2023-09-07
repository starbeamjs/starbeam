import { TAG } from "@starbeam/shared";
import { createFormulaTag } from "@starbeam/tags";

import { DEBUG, getRuntime } from "../runtime.js";
import { FinalizedFormula } from "./formula-lifecycle.js";
import {
  type FormulaFn,
  type SugaryPrimitiveOptions,
  toOptions,
  WrapFn,
} from "./utils.js";

export function CachedFormula<T>(
  compute: () => T,
  options?: SugaryPrimitiveOptions,
): FormulaFn<T> {
  const { description } = toOptions(options);
  const desc = DEBUG?.Desc("formula", description);

  let last: Last<T> | null = null;

  const { tag, markInitialized } = createFormulaTag(desc, () =>
    last === null ? new Set() : last.formula.children(),
  );

  function evaluate(): T {
    if (last === null) {
      const done = getRuntime().start();
      const value = compute();
      const formula = FinalizedFormula(done());

      last = { formula, value };

      markInitialized();
    } else if (last.formula.isStale()) {
      const lifecycle = last.formula.update();
      last.value = compute();
      lifecycle.done();
    }

    getRuntime().update(tag);
    getRuntime().consume(tag);
    return last.value;
  }

  function read(): T {
    DEBUG?.markEntryPoint(["reactive:read", desc]);
    const value = evaluate();
    getRuntime().consume(tag);
    return value;
  }

  return WrapFn({
    [TAG]: tag,
    read,
    get current(): T {
      DEBUG?.markEntryPoint(["reactive:read", desc, "current"]);
      return read();
    },
  });
}

interface Last<T> {
  readonly formula: FinalizedFormula;
  value: T;
}
