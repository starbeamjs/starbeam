import { FormulaFn } from "@starbeam/core";
import { describe, expect, test } from "vitest";

interface Person {
  name: string;
  location: string;
}

describe("MappedFormula", () => {
  test("should map a cell to a formula", () => {
    let id = 0;

    const mapped = FormulaFn({
      fn: (value: Person) => `${value.name} is in ${value.location} (${id++})`,
      equals: (a, b) => a.name === b.name && a.location === b.location,
    });

    expect(mapped({ name: "Tom", location: "NYC" })).toBe("Tom is in NYC (0)");
    expect(mapped({ name: "Tom", location: "NYC" })).toBe("Tom is in NYC (0)");
    expect(mapped({ name: "Tom", location: "SF" })).toBe("Tom is in SF (1)");
  });
});
