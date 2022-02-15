import { useCallback, useContext } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
import type { Reactive } from "starbeam";
import { STARBEAM } from "./component.js";

type LastValue<T> =
  | { readonly type: "initialized"; readonly value: T }
  | { readonly type: "uninitialized" };

const UNINITIALIZED: LastValue<never> = { type: "uninitialized" };

/**
 * The purpose of this class is to present the `Cell` interface in an object
 * that changes its referential equality whenever the internal value changes.
 *
 * It's a bridge between Starbeam's timestamp-based world and React's
 * equality-based world.
 */
class UnstableReactive<T> {
  static create<T>(reactive: Reactive<T>): UnstableReactive<T> {
    return new UnstableReactive(reactive, UNINITIALIZED);
  }

  static next<T>(prev: UnstableReactive<T>): UnstableReactive<T> {
    let next = prev.#reactive.current;

    if (prev.#value.type === "uninitialized" || prev.#value.value === next) {
      return prev;
    } else {
      return new UnstableReactive(prev.#reactive, {
        type: "initialized",
        value: next,
      });
    }
  }

  readonly #reactive: Reactive<T>;
  #value: LastValue<T>;

  private constructor(cell: Reactive<T>, value: LastValue<T>) {
    this.#reactive = cell;
    this.#value = value;
  }

  get current(): T {
    switch (this.#value.type) {
      case "initialized": {
        return this.#value.value;
      }
      case "uninitialized": {
        let value = this.#reactive.current;
        this.#value = {
          type: "initialized",
          value,
        };
        return value;
      }
    }
  }
}

export function useReactive<T>(reactive: Reactive<T>): T {
  let last = UnstableReactive.create(reactive);

  const starbeam = useContext(STARBEAM);

  // Create a stable subscribe callback for useSyncExternalStore.
  const subscribe = useCallback((notifyReact: () => void) => {
    // Whenever Starbeam advances...
    return starbeam.on.advance(() => {
      // UnstableReactive.next will return a referentially equal value if the
      // reactive hasn't changed. Otherwise, it will return a new
      // UnstableReactive.
      let next = UnstableReactive.next(last);

      // If we got a new UnstableReactive, we need to notify React.
      if (next !== last) {
        last = next;
        notifyReact();
      }
    });

    // starbeam.on.advance returns an unsubscriber, which we return to React to
    // call whenever this component is torn down.
  }, []);

  // Create a stable snapshot callback, which just returns the `UnstableCell` in `last`.
  const snapshot = useCallback(() => last, []);

  return useSyncExternalStoreWithSelector(
    subscribe,
    snapshot,
    null,
    (snapshot) => snapshot.current
  );
}
