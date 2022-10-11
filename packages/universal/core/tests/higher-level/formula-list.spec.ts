import { FormulaList } from "@starbeam/core";
import { reactive } from "@starbeam/js";
import { describe, expect, test } from "vitest";

interface Item {
  id: number;
  name: string;
  location: string;
}

describe("List transform", () => {
  test("should transform a list", () => {
    const list: Item[] = reactive.array([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);

    const formulas = FormulaList(list, {
      key: (item) => item.id,
      value: (item) => `${item.name} (${item.location})`,
    });

    expect(formulas.current).toEqual(["Tom (NYC)", "Chirag (NYC)"]);

    list.push({ id: 3, name: "John", location: "NYC" });

    expect(formulas.current).toEqual([
      "Tom (NYC)",
      "Chirag (NYC)",
      "John (NYC)",
    ]);

    list.pop();

    expect(list).toEqual([
      { id: 1, name: "Tom", location: "NYC" },
      { id: 2, name: "Chirag", location: "NYC" },
    ]);
    expect(formulas.current).toEqual(["Tom (NYC)", "Chirag (NYC)"]);

    list.reverse();

    expect(list).toEqual([
      { id: 2, name: "Chirag", location: "NYC" },
      { id: 1, name: "Tom", location: "NYC" },
    ]);

    expect(formulas.current).toEqual(["Chirag (NYC)", "Tom (NYC)"]);
  });
});
