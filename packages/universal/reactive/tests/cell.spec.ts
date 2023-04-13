import { Cell } from "@starbeam/reactive";
import { describe, test, expect } from "@starbeam-workspace/test-utils";

describe("Cell", () => {
  test("its current property works like a normal property", () => {
    const cell = Cell(1);
    expect(cell.current).toBe(1);
  });
});
