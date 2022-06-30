import {
  type CleanupTarget,
  type OnCleanup,
  type Reactive,
  type Unsubscribe,
  LIFETIME,
} from "@starbeam/timeline";

/**
 * {@linkcode useResource} is a Starbeam renderer that reads from reactive values and returns a
 * regular value.
 *
 * It takes a "reactive constructor" function that gets called on mount (including React 18
 * remounts).
 *
 * The reactive constructor
 */
export function useResource<T>(blueprint: ReactiveBlueprint<T>) {
  throw Error("Not implemented");
}

interface ReactiveBlueprint<T> {
  (builder: ReactiveBuilder): Reactive<T> | (() => T);
}

class ReactiveBuilder implements CleanupTarget {
  link(child: object): Unsubscribe {
    return LIFETIME.link(this, child);
  }
  on: OnCleanup = {
    cleanup: (finalizer: () => void): Unsubscribe => {
      return LIFETIME.on.cleanup(this, finalizer);
    },
  };
}
