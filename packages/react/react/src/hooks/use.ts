import type { ReactiveBlueprint } from "@starbeam/renderer";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import {
  unsafeTrackedElsewhere,
  useLastRenderRef,
} from "@starbeam/use-strict-lifecycle";

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
