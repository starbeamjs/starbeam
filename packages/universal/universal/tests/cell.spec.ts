import { Cell } from "@starbeam/universal";
import { describe, expect, test } from "vitest";
console.log(1);

describe("Cell", () => {
  test("creates reactive storage", () => {
    const cell = Cell(0);
    expect(cell.current).toBe(0);
  });

  test("updates reactive storage with set", () => {
    const cell = Cell(0);
    cell.set(1);
    expect(cell.current).toBe(1);
  });

  test("updates reactive storage with update", () => {
    const cell = Cell(0);
    cell.update((prev) => prev + 1);
    expect(cell.current).toBe(1);

    cell.update((prev) => prev + 1);
    expect(cell.current).toBe(2);
  });

  test("can be frozen", () => {
    const cell = Cell(0);
    cell.freeze();
    expect(() => cell.set(1)).toThrow(TypeError);
  });
});
