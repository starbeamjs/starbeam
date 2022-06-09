import { type Reactive, Cell, Marker } from "@starbeam/core";
import { type DescriptionArgs, Stack } from "@starbeam/debug";
import reactive from "@starbeam/js";
import { useUpdatingVariable } from "@starbeam/use-resource";
import type { Dispatch, SetStateAction } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<PropertyKey, any>;

/**
 * {@link useStable} takes an object containing stable React variables
 * (such as React props) and converts it into a Starbeam
 * [Reactive Object].
 *
 * [reactive object]: https://github.com/wycats/starbeam/tree/main/%40starbeam/react/GLOSSARY.md#reactive-object
 */
export function useStable<I extends AnyRecord>(
  variable: I,
  description?: string | DescriptionArgs
): I {
  const desc = Stack.description(description);

  return useUpdatingVariable({
    initial: () => reactive.object(variable, desc),
    update: (stableProps) => {
      Object.assign(stableProps, variable);
    },
  });
}

/**
 * {@link useStableVariable} takes a stable React variable and converts it
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
export function useStableVariable<T>(
  variable: T,
  description = Stack.describeCaller()
): Reactive<T> {
  return useUpdatingVariable({
    initial: () => Cell(variable, description),
    update: (cell) => cell.set(variable),
  });
}

export function useProp<T>(variable: T, description?: string): Reactive<T> {
  return useUpdatingVariable({
    initial: () => {
      return Cell(variable, Stack.description(description, 3));
    },
    update: (cell) => cell.set(variable),
  });
}

export function useProps<T extends AnyRecord>(
  props: T,
  description?: string | DescriptionArgs
): T {
  const desc = Stack.description(description);

  return useUpdatingVariable({
    initial: () => reactive.object(props, desc),
    update: (stableProps) => {
      Object.assign(stableProps, props);
    },
  });
}

/**
 * {@link useStableVariable.mutable} takes a stable React variable *plus* an
 * updater function returned by {@link useState} and returns a Starbeam _Mutable
 * Reactive Value_.
 */
useStableVariable.mutable = <S>(
  value: S,
  setValue: SetValue<S>,
  description?: string | DescriptionArgs
): ReactiveState<S> => {
  const desc = Stack.description(description);

  return useUpdatingVariable({
    initial: () => ReactiveState.create(value, setValue, desc),
    update: (state) => ReactiveState.update(state, value),
  });
};

type SetValue<T> = Dispatch<SetStateAction<T>>;

export class ReactiveState<T> {
  static create<T>(
    value: T,
    setValue: SetValue<T>,
    description: DescriptionArgs
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
