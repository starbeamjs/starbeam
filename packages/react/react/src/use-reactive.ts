import type { Description, Reactive } from "@starbeam/interfaces";
import {
  DEBUG,
  Formula as Formula,
  isReactive,
  read,
} from "@starbeam/reactive";
import { render } from "@starbeam/runtime";
import { Cell } from "@starbeam/universal";
import {
  unsafeTrackedElsewhere,
  useInstance,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

import { sameDeps } from "./use-resource.js";

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
  computeFn: Reactive<T> | (() => T),
  description?: string | Description | undefined
): T {
  const desc = DEBUG?.Desc("formula", description);

  const notify = useNotify();

  return useLifecycle({ props: computeFn })
    .render(({ on }, originalCompute) => {
      if (
        !isReactive(originalCompute) &&
        typeof originalCompute !== "function"
      ) {
        console.trace();
      }

      let compute = originalCompute;

      // compute can change, so the `PolledFormula` doesn't close over the original value, but
      // rather invokes the **current** value (which can change in `on.update`).
      const formula = Formula(
        () => (isReactive(compute) ? read(compute) : compute()),
        desc
      );

      on.update((newCompute) => {
        compute = newCompute;
      });

      // We wait until the first layout to subscribe to the formula, because React will
      // only guarantee that the cleanup function is called after the first layout.
      on.layout(() => {
        const unsubscribe = render(formula, notify);
        on.cleanup(unsubscribe);
      });

      return formula;
    })
    .read(DEBUG?.callerStack());
}

/**
 * Returns a function that can be called to notify React that the current component should be
 * re-rendered.
 */
export function useNotify(): () => void {
  const [, setNotify] = useState({});
  return () => {
    setNotify({});
  };
}

export function setupCell<T>(
  value: T,
  description?: Description | string
): Cell<T> {
  const desc = DEBUG?.Desc("cell", description);

  return setup(() => Cell(value, { description: desc }));
}

export function setup<T>(blueprint: () => T): T {
  return useInstance(blueprint);
}

export function useSetup<T>(
  blueprint: () => T | Reactive<T>,
  deps: unknown[]
): T {
  const instance = useLifecycle({
    validate: deps,
    with: sameDeps,
  }).render(blueprint);

  return unsafeTrackedElsewhere(() => read(instance));
}
