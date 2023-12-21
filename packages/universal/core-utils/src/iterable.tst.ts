import { describe, expect, test } from "tstyche";

import type { PresentArray } from "./array.js";
import { iterableHasItems, reverse } from "./iterable.js";

describe("type checks", () => {
  describe("reverse", () => {
    test("PresentArray", () => {
      const array = ["a", "b", "c"] as const;
      expect(reverse(array)).type.toEqual<PresentArray<"b" | "a" | "c">>();
    });

    test("Set", () => {
      const set = new Set(["a", "b", "c"]);
      expect(reverse(set)).type.toEqual<string[]>();
    });
  });

  describe("iterableHasItems", () => {
    test("PresentArray", () => {
      const array = ["a", "b", "c"] as const;
      expect(iterableHasItems(array)).type.toEqual<true>();
    });
  });
});
