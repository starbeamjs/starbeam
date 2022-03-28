import { Stack } from "@starbeam/debug-utils";
import type { AnyRecord } from "@starbeam/fundamental";
import { Cell, Marker, Reactive } from "@starbeam/reactive";
import { useUpdatingVariable } from "@starbeam/use-resource";
import type { Dispatch, SetStateAction } from "react";
import { StableProps } from "./stable-props.js";

/**
 * {@link useReactive} takes an object containing stable React variables
 * (such as React props) and converts it into a Starbeam
 * [Reactive Object].
 *
 * [reactive object]: https://github.com/wycats/starbeam/tree/main/%40starbeam/react/GLOSSARY.md#reactive-object
 */
export function useReactive<I extends AnyRecord>(variable: I): I {
  return useUpdatingVariable({
    initial: () => StableProps.from(variable),
    update: (stableProps) => {
      stableProps.update(variable);
    },
  }).proxy;
}

/**
 * {@link useReactiveVariable} takes a stable React variable and converts it
 * into a Starbeam Reactive value.
 *
 * ```ts
 * function Counter({ count }: { count: number }) {
 *   const stableCount = useReactiveVariable(count);
 *
 *   return useReactiveElement(() => {
 *     const extra = reactive({ count: 0 });
 *
 *     return () => <>
 *       <button onClick={() => extra.count++}>++ extra ++</button>
 *       <p>Total: {stableCount.current + extras.count}</p>
 *     </>
 *   });
 * }
 * ```
 */
export function useReactiveVariable<T>(variable: T): Reactive<T> {
  return useUpdatingVariable({
    initial: () => Cell(variable),
    update: (cell) => cell.set(variable),
  });
}

/**
 * {@link useReactiveVariable.mutable} takes a stable React variable *plus* an
 * updater function returned by {@link useState} and returns a Starbeam _Mutable
 * Reactive Value_.
 */
useReactiveVariable.mutable = <S>(
  value: S,
  setValue: SetValue<S>,
  description = Stack.describeCaller()
): ReactiveState<S> => {
  return useUpdatingVariable({
    initial: () => ReactiveState.create(value, setValue, description),
    update: (state) => ReactiveState.update(state, value),
  });
};

type SetValue<T> = Dispatch<SetStateAction<T>>;

export class ReactiveState<T> {
  static create<T>(
    value: T,
    setValue: SetValue<T>,
    description: string
  ): ReactiveState<T> {
    return new ReactiveState(value, setValue, Marker(description));
  }

  static update<T>(state: ReactiveState<T>, value: T): void {
    if (value !== state.#value) {
      state.#value = value;
      state.#marker.update();
    }
  }

  #value: T;
  readonly #setValue: SetValue<T>;
  readonly #marker: Marker;

  private constructor(value: T, setValue: SetValue<T>, marker: Marker) {
    this.#value = value;
    this.#setValue = setValue;
    this.#marker = marker;
  }

  get current(): T {
    this.#marker.consume();
    return this.#value;
  }

  set current(value: T) {
    this.#value = value;
    this.#setValue(value);
    this.#marker.update();
  }

  update(updater: (value: T) => T): void {
    this.current = updater(this.#value);
  }
}
