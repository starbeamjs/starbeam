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

if (import.meta.vitest) {
  const { test, describe, expect } = import.meta.vitest;

  describe("reverse", () => {
    test("should reverse an array", () => {
      const input = ["a", "b", "c"];
      const output = reverse(input);
      expect(output).toEqual(["c", "b", "a"]);
    });

    test("should reverse a set", () => {
      const input = new Set(["a", "b", "c"]);
      const output = reverse(input);
      expect(output).toEqual(["c", "b", "a"]);
    });

    test("should return an empty array when input is empty", () => {
      expect(reverse([])).toEqual([]);
      expect(reverse(new Set())).toEqual([]);
    });
  });

  describe("iterableHasItems", () => {
    test("should return true when iterable has items", () => {
      expect(iterableHasItems(["a", "b", "c"])).toBe(true);
      expect(iterableHasItems(new Set(["a", "b", "c"]))).toBe(true);
    });

    test("should return false when iterable is empty", () => {
      expect(iterableHasItems([])).toBe(false);
      expect(iterableHasItems(new Set())).toBe(false);
    });
  });
}
