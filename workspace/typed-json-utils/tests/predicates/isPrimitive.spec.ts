import type { JsonValue } from "@starbeam/core-utils";
import { isPrimitive } from "typed-json-utils";
import { describe, expect, test } from "vitest";

import {
  testArrays,
  testBooleans,
  testNull,
  testNumbers,
  testObjects,
  testStrings,
  testUndefined,
} from "./shared.js";

describe("isPrimitive", () => {
  describe("witout type narrowing", () => {
    test("returns false for undefined", () => {
      expect(isPrimitive(undefined)).toBe(false);
    });

    test("returns true for null", () => {
      expect(isPrimitive(null)).toBe(true);
    });

    test("returns true for numbers", () => {
      testNumbers(isPrimitive, true);
    });

    test("returns true for strings", () => {
      testStrings(isPrimitive, true);
    });

    test("returns true for boolean", () => {
      testBooleans(isPrimitive, true);
    });

    test("returns false for arrays", () => {
      testArrays(isPrimitive, false);
    });

    test("returns false for objects", () => {
      testObjects(isPrimitive, false);
    });
  });

  describe("(Number)", () => {
    function isNumber(value: JsonValue | undefined): value is number {
      return isPrimitive(value, Number);
    }

    test("returns false for undefined", () => {
      testUndefined(isNumber);
    });

    test("returns false for null", () => {
      testNull(isNumber, false);
    });

    test("returns true for numbers", () => {
      testNumbers(isNumber, true);
    });

    test("returns false for strings", () => {
      testStrings(isNumber, false);
    });

    test("returns false for boolean", () => {
      testBooleans(isNumber, false);
    });

    test("returns false for arrays", () => {
      testArrays(isNumber, false);
    });

    test("returns false for objects", () => {
      testObjects(isNumber, false);
    });
  });

  describe("(String)", () => {
    function isString(value: JsonValue | undefined): value is string {
      return isPrimitive(value, String);
    }

    test("returns false for undefined", () => {
      testUndefined(isString);
    });

    test("returns false for null", () => {
      testNull(isString, false);
    });

    test("returns false for numbers", () => {
      testNumbers(isString, false);
    });

    test("returns true for strings", () => {
      testStrings(isString, true);
    });

    test("returns false for arrays", () => {
      testArrays(isString, false);
    });

    test("returns false for objects", () => {
      testObjects(isString, false);
    });

    test("returns false for booleans", () => {
      testBooleans(isString, false);
    });
  });

  describe("(Boolean)", () => {
    function isBoolean(value: JsonValue | undefined): value is string {
      return isPrimitive(value, Boolean);
    }

    test("returns false for undefined", () => {
      testUndefined(isBoolean);
    });

    test("returns false for null", () => {
      testNull(isBoolean, false);
    });

    test("returns false for numbers", () => {
      testNumbers(isBoolean, false);
    });

    test("returns false for strings", () => {
      testStrings(isBoolean, false);
    });

    test("returns false for arrays", () => {
      testArrays(isBoolean, false);
    });

    test("returns false for objects", () => {
      testObjects(isBoolean, false);
    });

    test("returns true for booleans", () => {
      testBooleans(isBoolean, true);
    });
  });
});
