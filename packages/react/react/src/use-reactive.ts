import { Cell, PolledFormulaFn, TIMELINE } from "@starbeam/core";
import { type Description, Desc } from "@starbeam/debug";
import { useLifecycle } from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

import { useSetup } from "./use-setup.js";

/**
 * {@linkcode useReactive} is a Starbeam renderer that computes a value from reactive values and
 * automatically notifies React when the inputs change.
 *
 * It doesn't memoize the value, so if the component re-renders, the value will be recomputed. This
 * means that you can use normal React values in the formula without declaring any dependencies, but
 * still get notified if Starbeam dependencies change.
 *
 * If you also want to memoize the value, you can use {@linkcode useReactiveMemo}.
 */
export function useReactive<T>(
  compute: () => T,
  description?: string | Description
): T {
  const desc = Desc("formula", description);
  const notify = useNotify();

  return useLifecycle(compute, (lifecycle) => {
    const formula = PolledFormulaFn(() => {
      return compute();
    }, desc);

    lifecycle.on.update((newCompute) => {
      compute = newCompute;
    });

    lifecycle.on.layout(() => {
      lifecycle.on.cleanup(TIMELINE.on.change(formula, notify));
    });

    return formula;
  }).current;
}

export function useNotify(): () => void {
  const [, setNotify] = useState({});
  return () => setNotify({});
}

export function useCell<T>(
  value: T,
  description?: Description | string
): Cell<T> {
  const desc = Desc("cell", description);

  return useSetup(() => Cell(value, { description: desc }));
}
