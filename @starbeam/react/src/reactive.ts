import { useCallback, useContext } from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector";
import { assert, Cell, Enum, Memo, type Reactive } from "starbeam";
import { STARBEAM } from "./component.js";

class LastValue<T> extends Enum("Initialized(T)", "Uninitialized(U)")<
  T,
  string
> {
  assert(): T {
    return this.match({
      Initialized: (value) => value,
      Uninitialized: (description) => {
        throw Error(
          `BUG: Attempting to access an uninitialized value (${description})`
        );
      },
    });
  }

  get initialized(): T | null {
    return this.match({
      Initialized: (value) => value,
      Uninitialized: () => null,
    });
  }

  get isUninitialized(): boolean {
    return !this.isInitialized;
  }

  get isInitialized(): boolean {
    return this.match({
      Initialized: () => true,
      Uninitialized: () => false,
    });
  }
}

const l = LastValue.Uninitialized("Reactive<T>");

/**
 * The purpose of this class is to present the `Cell` interface in an object
 * that changes its referential equality whenever the internal value changes.
 *
 * It's a bridge between Starbeam's timestamp-based world and React's
 * equality-based world.
 */
class UnstableReactive<T> {
  // static create<T>(reactive: Reactive<T>): UnstableReactive<T> {
  //   return new UnstableReactive(reactive, UNINITIALIZED);
  // }

  static uninitialized<T>(): UnstableReactive<T> {
    return new UnstableReactive<T>(
      LastValue.Uninitialized("Reactive<T>"),
      LastValue.Uninitialized("T")
    );
  }

  static next<T>(current: UnstableReactive<T>): UnstableReactive<T> {
    let initialized = current.#reactive.initialized;

    if (initialized === null) {
      return current;
    }

    let prev = current.#value.initialized;

    if (prev === null) {
      return current;
    }

    let next = initialized.current;

    if (prev === next) {
      return current;
    }

    return new UnstableReactive(current.#reactive, LastValue.Initialized(next));
  }

  #reactive: LastValue<Reactive<T>>;
  #value: LastValue<T>;

  private constructor(cell: LastValue<Reactive<T>>, value: LastValue<T>) {
    this.#reactive = cell;
    this.#value = value;
  }

  initialize(reactive: Reactive<T>): void {
    this.#reactive = LastValue.Initialized(reactive);
  }

  get current(): T {
    let reactive = this.#reactive.match({
      Uninitialized: (description) => {
        throw Error(
          `BUG: Cannot get the current value of ${description} before initializing it`
        );
      },
      Initialized: (value) => value,
    });

    return this.#value.match({
      Uninitialized: () => {
        let value = reactive.current;
        this.#value = LastValue.Initialized(value);
        return value;
      },
      Initialized: (value) => value,
    });
  }
}

export function useReactive<T>(callback: () => T): T {
  // const cell: Cell<null | T> = Cell(null);
  let last = UnstableReactive.uninitialized<T>();

  const starbeam = useContext(STARBEAM);

  // Create a stable subscribe callback for useSyncExternalStore.
  const subscribe = useCallback((notifyReact: () => void) => {
    const memo = Memo(callback);
    last.initialize(memo);

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
    (snapshot: UnstableReactive<T>) => snapshot.current
  );
}
