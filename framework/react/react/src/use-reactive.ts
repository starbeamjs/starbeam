import { Cell, LIFETIME, PolledFormulaFn, TIMELINE } from "@starbeam/core";
import type { Description } from "@starbeam/debug";
import { descriptionFrom } from "@starbeam/debug";
import { getID } from "@starbeam/peer";
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
  const desc = descriptionFrom({
    type: "formula",
    id: getID(),
    api: "useReactive",
    fromUser: description,
  });

  const [, setNotify] = useState({});

  const formula = useLifecycle(compute, (lifecycle) => {
    const formula = PolledFormulaFn(() => {
      return compute();
    }, desc);

    lifecycle.on.update((newCompute) => {
      compute = newCompute;
    });

    lifecycle.on.layout(() => {
      const renderer = TIMELINE.on.change(formula, () => {
        setNotify({});
      });

      lifecycle.on.cleanup(() => {
        LIFETIME.finalize(renderer);
      });
    });

    return formula;
  });

  return formula.current;
}

export function useCell<T>(
  value: T,
  description?: Description | string
): Cell<T> {
  const desc = descriptionFrom({
    type: "cell",
    id: getID(),
    api: {
      package: "@starbeam/react",
      name: "useCell",
    },
    fromUser: description,
  });

  return useSetup(() => Cell(value, { description: desc }));
}
