import { Formula, LIFETIME, TIMELINE } from "@starbeam/core";
import { type DescriptionArgs, Stack } from "@starbeam/debug";
import { useLifecycle } from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

import { useDeps } from "./utils.js";

/**
 * {@linkcode useReactive} is a Starbeam renderer that computes a value from reactive values and
 * automatically notifies React when the inputs change.
 */
export function useReactive<T>(
  compute: () => T,
  dependencies?: unknown[],
  description?: string
): T;
export function useReactive<T>(compute: () => T, description?: string): T;
export function useReactive<T>(
  compute: () => T,
  dependencies?: unknown[] | string,
  description?: string
): T {
  const { dependencies: deps, description: desc } = normalizeArgs(
    dependencies,
    description
  );

  const reactiveDeps = useDeps(deps ?? [], desc);

  const [, setNotify] = useState({});

  const formula = useLifecycle((lifecycle) => {
    const formula = Formula(() => {
      reactiveDeps.consume();
      return compute();
    });

    const renderer = TIMELINE.render(formula, () => setNotify({}), desc);

    lifecycle.on.cleanup(() => {
      LIFETIME.finalize(renderer);
    });

    return formula;
  });

  return formula.current;
}

function normalizeArgs(
  dependencies?: unknown[] | string,
  description?: string
): { dependencies?: unknown[]; description?: DescriptionArgs } {
  if (description === undefined) {
    if (typeof dependencies === "string") {
      return { description: Stack.description(dependencies, 1) };
    } else if (dependencies === undefined) {
      return {};
    } else {
      return { dependencies };
    }
  } else {
    return {
      dependencies: dependencies as unknown[],
      description: Stack.description(description, 1),
    };
  }
}
