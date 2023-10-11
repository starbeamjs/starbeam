import { isObject } from "typed-json-utils";
import { describe, expect, test } from "vitest";

import {
  ARRAYS,
  OBJECTS,
  testArrayLikes,
  testBooleans,
  testNumbers,
  testStrings,
  testUndefined,
} from "./shared.js";

describe("isObject", () => {
  test("returns true for object", () => {
    for (const object of OBJECTS) {
      expect(isObject(object)).toBe(true);
    }
  });

  test("returns false for arrays", () => {
    for (const array of ARRAYS) {
      expect(isObject(array)).toBe(false);
    }
  });

  test("returns true for array-like objects", () => {
    testArrayLikes(isObject, true);
  });

  test("returns false for strings", () => {
    testStrings(isObject, false);
  });

  test("returns false for numbers", () => {
    testNumbers(isObject, false);
  });

  test("returns false for booleans and null", () => {
    testBooleans(isObject, false);
  });

  test("returns false for undefined", () => {
    testUndefined(isObject);
  });
});
