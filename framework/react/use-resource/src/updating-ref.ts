import { useRef, type MutableRefObject } from "react";
import { UNINITIALIZED } from "./utils.js";

export interface Ref<T> {
  readonly current: T;
}

/**
 * This interface allows you to change the ref returned by
 * {@link useMutableUpdatingRef} to a more expansive value than the ones returned by
 * `initial()` or `update()`, while still allowing code that runs *inside* the
 * render function to assume the narrower meaning.
 *
 * Even if you update the {@link ref} with a more expansive type, the next time
 * the containing component renders, its `update()` function will run again,
 * converting the wider definition back into the narrower meaning.
 *
 * For example, this allows you to set the ref to something else in
 * {@link useEffect}, and then use that information in `update()` to convert
 * what {@link useEffect} did back into the original value.
 *
 * This is sometimes necessary to coordinate between:
 *
 * - top-level rendering code, which is allowed to use hooks
 * - JSX returned by top-level rendering code, which wants immediate access to
 *   values
 * - useEffect and useLayoutEffect, which have access to component elements
 *   (installed via `ref`), but which cannot use hooks or produce JSX in the
 *   context of the top-level render.
 */
export interface MutableUpdatingRef<T, Wide = T> {
  /**
   * The value returned by `initial()` or `update()` in {@link useMutableUpdatingRef}.
   *
   */
  readonly value: T;
  /**
   * A React Ref that you can update with a more expansive type.
   */
  readonly ref: MutableRefObject<Wide>;
}

export function useUpdatingVariable<T>(options: {
  initial: () => T;
  update: (value: T) => T | void;
}): T {
  return useUpdatingRef(options).current;
}

export function useUpdatingRef<T>({
  initial,
  update,
}: {
  initial: () => T;
  update: (value: T) => T | void;
}): Ref<T> {
  const ref = useRef<T | UNINITIALIZED>(UNINITIALIZED);

  if (ref.current === UNINITIALIZED) {
    ref.current = initial();
  } else {
    const next = update(ref.current);

    if (next !== undefined) {
      ref.current = next;
    }
  }

  return ref as Ref<T>;
}

/**
 * The `T` type is the type you can assign to `current`.
 */
useUpdatingRef.mutable = <Returned extends Supports, Supports = Returned>({
  initial,
  update,
}: {
  initial: () => Returned;
  update: (value: Supports) => Returned | void;
}): { ref: MutableRefObject<Supports>; value: Returned } => {
  const ref = useRef<Supports | UNINITIALIZED>(UNINITIALIZED);
  let value: Returned;

  if (ref.current === UNINITIALIZED) {
    value = ref.current = initial();
  } else {
    const next = update(ref.current as Supports);

    if (next !== undefined) {
      ref.current = next;
    }

    value = ref.current as Returned;
  }

  return { ref: ref as MutableRefObject<Supports>, value };
};

/**
 * This function takes a piece of state that is available as a per-render value
 * (e.g. props or the first element of the array returned by useState) and
 * converts it into a ref.
 *
 * From the perspective of top-level render functions, this ref is totally
 * pointless, and is equivalent to just accessing the state in the render
 * function.
 *
 * Instead, its primary purpose to make such state available to useEffect and
 * useLayoutEffect callbacks without needing to worry about the possibility of
 * stale closures.
 */
export function useLastRenderRef<S>(state: S): Ref<S> {
  return useUpdatingRef({
    initial: () => state,
    update: () => state,
  });
}
