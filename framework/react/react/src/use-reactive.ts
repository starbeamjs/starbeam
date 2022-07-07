import { LIFETIME, PolledFormula, TIMELINE } from "@starbeam/core";
import { descriptionFrom } from "@starbeam/debug";
import { useLifecycle } from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

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
export function useReactive<T>(compute: () => T, description?: string): T {
  const desc = descriptionFrom({
    type: "formula",
    api: "useReactive",
    fromUser: description,
  });

  const [, setNotify] = useState({});

  const formula = useLifecycle(compute, (lifecycle) => {
    const formula = PolledFormula(() => {
      return compute();
    }, desc);

    lifecycle.on.update((compute) => {
      formula.update(compute);
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
