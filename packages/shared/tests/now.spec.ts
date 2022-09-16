import { bump, now } from "@starbeam/shared";
import { describe, expect, test } from "vitest";

describe("now", () => {
  test("now is a number", () => {
    expect(typeof now()).toBe("number");
  });

  test("bumping the number makes it bigger", () => {
    const first = now();
    const second = bump();
    expect(second).toBeGreaterThan(first);
  });
});
