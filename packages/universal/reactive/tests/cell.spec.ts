import { Cell } from "@starbeam/reactive";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

describe("Cell", () => {
  test("its current property works like a normal property", () => {
    const cell = Cell(1);
    expect(cell.current).toBe(1);
  });
});
