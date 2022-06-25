import { isObject } from "@starbeam/core-utils";
import { describe, expect, test } from "vitest";

describe("object utils", () => {
  test("isObject", () => {
    expect(isObject(null)).toBe(false);
    expect(isObject({})).toBe(true);
    expect(isObject(new (class {})())).toBe(true);
    expect(isObject([])).toBe(true);
  });
});
