import type { ReactiveBlueprint } from "@starbeam/renderer";
import { intoResourceBlueprint } from "@starbeam/renderer";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { Resource } from "@starbeam/resource";
import {
  unsafeTrackedElsewhere,
  useLastRenderRef,
} from "@starbeam/use-strict-lifecycle";
import { useCallback, useState } from "react";

import { createReactive, createResource, useSetup } from "./setup.js";

/**
 * A non-empty tuple. Used for the `bridge` argument of hooks that cross
 * the React-state ↔ Starbeam-state boundary: if you have nothing to
 * bridge, don't pass the argument; if you pass it, it must declare at
 * least one React-side value that invalidates the hook when it changes.
 *
 * An empty-array `bridge` is prohibited at the type level because it's
 * semantically a lie: "I capture nothing unstable" is the same as "I
 * don't have a bridge at all." See docs/INVARIANTS.md §17.
 */
type Bridge = readonly [unknown, ...unknown[]];

export type ElementResource<T, E extends Element> =
  | {
      readonly status: "pending";
      readonly ref: (element: E | null) => void;
    }
  | {
      readonly status: "attached";
      readonly ref: (element: E | null) => void;
      readonly current: T;
    };

export type ElementResourceBlueprint<E extends Element, T> = (
  element: E,
) => IntoResourceBlueprint<T>;

/**
 * `useReactive(compute)` runs `compute` and returns its value, re-running
 * whenever any reactive state it reads changes. Starbeam tracks the
 * reactive reads automatically — no deps array is needed for
 * Starbeam-owned state.
 *
 * `useReactive(compute, bridge)` is the form you reach for when `compute`
 * also captures React-owned state (props, `useState`, `useParams`, etc.).
 * List those React-side values in `bridge`; changing any of them rebuilds
 * the formula. The `bridge` tuple must be non-empty: if you have nothing
 * to bridge, use the one-argument form.
 *
 * If you already have a `Reactive<T>` and want its value, call
 * `useReactive(() => reactive.current)` — the `compute` form subsumes the
 * unwrap case.
 */
export function useReactive<T>(
  compute: ReactiveBlueprint<T>,
  bridge?: Bridge,
): T {
  const [currentCompute] = useLastRenderRef(compute);
  const reactive = createReactive(currentCompute, bridge);

  return unsafeTrackedElsewhere(() => reactive.read());
}

export function useService<T>(blueprint: IntoResourceBlueprint<T>): T {
  return useSetup(({ service }) => service(blueprint));
}

export function useResource<T>(
  blueprint: IntoResourceBlueprint<T>,
  bridge?: Bridge,
): T {
  return createResource(blueprint, bridge);
}

export function useElementResource<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  bridge?: Bridge,
): ElementResource<T, E> {
  const [element, setElement] = useState<E | null>(null);
  const [currentBlueprint] = useLastRenderRef(blueprint);

  const ref = useCallback((element: E | null) => {
    setElement(element);
  }, []);

  const attachment = useResource(
    () =>
      Resource(({ use }) => {
        if (element === null) {
          return { status: "pending" as const, ref };
        }

        return {
          status: "attached" as const,
          ref,
          current: use(
            intoResourceBlueprint(currentBlueprint.current(element)),
          ),
        };
      }),
    bridge ? [element, ...bridge] : [element],
  );

  return attachment;
}
