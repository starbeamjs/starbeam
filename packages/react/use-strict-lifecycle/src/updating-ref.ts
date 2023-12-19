import type { MutableRefObject } from "react";
import { useRef } from "react";

import { UNINITIALIZED } from "./utils.js";

/**
 * This is basically the React `Ref` type, but the React version forces
 * `current` to be `| null`, which is impossible here, because it's not a DOM
 * ref.
 */
export interface Ref<T> {
  readonly current: T;
}

/**
 * This function takes a callback that is used to initialize a ref, and returns
 * a tuple of `[ref, isUpdate]`.
 *
 * The first time `useInitializedRef` is called, it will call the callback and
 * store the result in the ref, and return `[ref, false]`. On subsequent calls,
 * it will return `[ref, true]` (the same ref).
 */
export function useInitializedRef<T>(
  initial: () => T,
): [ref: MutableRefObject<T>, isUpdate: boolean] {
  const ref = useRef(UNINITIALIZED as T | UNINITIALIZED);

  if (ref.current === UNINITIALIZED) {
    ref.current = initial();
    return [ref as MutableRefObject<T>, false];
  } else {
    return [ref as MutableRefObject<T>, true];
  }
}

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
export function useLastRenderRef<S>(
  state: S,
): [ref: Ref<S>, prev: S | UNINITIALIZED] {
  const ref = useRef<S | UNINITIALIZED>(UNINITIALIZED);
  const prev = ref.current;

  ref.current = state;
  return [ref as Ref<S>, prev];
}
