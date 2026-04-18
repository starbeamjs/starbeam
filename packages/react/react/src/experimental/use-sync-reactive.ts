/**
 * Prototype: `useReactive` built on `useSyncExternalStore`.
 *
 * Exists to compare against the current `useReactive` implementation (which
 * drives its own scheduler on top of `useLifecycle`). Not exported from
 * `@starbeam/react`'s public surface; imported directly by test files.
 *
 * Tradeoffs being evaluated:
 *
 * - `getSnapshot` must return an `Object.is`-stable value. We return a
 *   revision integer (from `lastUpdated`). Values of the reactive are not used
 *   as the snapshot — they're read during render.
 * - uSES handles re-subscription, concurrent-rendering tearing, and
 *   Transition fallback for free. We trade implementation simplicity for
 *   dependency on React's scheduling.
 * - No direct use of `useLifecycle`: the prototype treats "bind this reactive
 *   value to the component's observation lifetime" as separate from
 *   "setup-once-per-activation."
 */

import type { Reactive } from "@starbeam/interfaces";
import { CachedFormula } from "@starbeam/reactive";
import { getTag, RUNTIME } from "@starbeam/runtime";
import { unsafeTrackedElsewhere } from "@starbeam/use-strict-lifecycle";
import { useCallback, useRef, useSyncExternalStore } from "react";

export function useSyncReactive<T>(reactive: Reactive<T>): T {
  // Stable wrapper so that `subscribe` and `getSnapshot` see the same
  // reactive identity across renders, even if the caller passes a new
  // reactive each time.
  //
  // For the prototype we accept that callers pass a stable reactive (the
  // common case — `setup(() => Cell(0))`). A production version would also
  // handle "reactive switched" by resubscribing.
  const cachedRef = useRef<ReturnType<typeof CachedFormula<T>> | null>(null);
  if (cachedRef.current === null) {
    cachedRef.current = CachedFormula(() => reactive.read());
  }
  const cached = cachedRef.current;

  const subscribe = useCallback(
    (notify: () => void) => {
      const unsubscribe = RUNTIME.subscribe(cached, notify);
      return () => void unsubscribe?.();
    },
    [cached],
  );

  const getSnapshot = useCallback((): number => {
    // Force evaluation so the formula tag is initialized and has
    // dependencies. Once initialized, the max `lastUpdated` across deps
    // is a stable integer that only changes when reactive state actually
    // changes — the perfect uSES snapshot.
    cached.read();
    const tag = getTag(cached);
    const deps = typeof tag.dependencies === "function"
      ? tag.dependencies()
      : [];
    let max = 0;
    for (const dep of deps) {
      if (dep.lastUpdated.at > max) max = dep.lastUpdated.at;
    }
    return max;
  }, [cached]);

  // Drive re-rendering via uSES. The returned snapshot (a number) is
  // ignored; the actual value is read below.
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Read the current value. `unsafeTrackedElsewhere` bypasses the
  // rendering-phase read guard, matching the pattern used by the current
  // `useReactive` implementation.
  return unsafeTrackedElsewhere(() => cached.read());
}
