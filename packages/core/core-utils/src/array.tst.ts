import { describe, expect, test } from "tstyche";

import { isPresentArray } from "./array.js";

describe("type checks", () => {
  describe("isPresentArray", () => {
    test("empty array", () => {
      const array = ["hello"] as const;
      if (isPresentArray(array)) {
        expect(array).type.toEqual<readonly ["hello"]>();
      }
    });
  });
});
