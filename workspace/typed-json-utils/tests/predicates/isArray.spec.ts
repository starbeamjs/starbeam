import { isArray } from "typed-json-utils";
import { describe, test } from "vitest";

import {
  testArrayLikes,
  testArrays,
  testBooleans,
  testNumbers,
  testObjects,
  testStrings,
  testUndefined,
} from "./shared.js";

describe("predicates", () => {
  describe("isArray", () => {
    test("returns true for arrays", () => {
      testArrays(isArray, true);
    });

    test("returns false for objects", () => {
      testObjects(isArray, false);
    });

    test("returns false for array-likes", () => {
      testArrayLikes(isArray, false);
    });

    test("returns false for strings", () => {
      testStrings(isArray, false);
    });

    test("returns false for numbers", () => {
      testNumbers(isArray, false);
    });

    test("returns false for booleans and null", () => {
      testBooleans(isArray, false);
    });

    test("returns false for undefined", () => {
      testUndefined(isArray);
    });
  });
});
