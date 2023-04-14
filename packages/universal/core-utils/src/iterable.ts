import type { AnyArray, PresentArray } from "./array.js";

export function reverse<T>(list: PresentArray<T>): PresentArray<T>;
export function reverse<T>(list: Iterable<T>): T[];
export function reverse<T>(list: Iterable<T>): AnyArray<T> {
  return [...list].reverse();
}

export function iterableHasItems<T>(list: PresentArray<T>): true;
export function iterableHasItems<T>(iterable: Iterable<T>): boolean;
export function iterableHasItems<T>(iterable: Iterable<T>): boolean {
  const iterator = iterable[Symbol.iterator]();
  return !iterator.next().done;
}
