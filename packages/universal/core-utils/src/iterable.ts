import type { AnyArray, PresentArray } from "./array.js";

export function reverse<T>(list: PresentArray<T>): PresentArray<T>;
export function reverse<T>(list: Iterable<T>): T[];
export function reverse<T>(list: Iterable<T>): AnyArray<T> {
  return [...list].reverse();
}
