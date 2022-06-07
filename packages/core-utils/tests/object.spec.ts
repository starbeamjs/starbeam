import { isObject } from "@starbeam/core-utils";
import { describe, expect, test } from "vitest";

describe("object utils", () => {
  test("isObject", () => {
    expect(isObject(null)).toBe(false);
  });
});
