/* eslint-disable @typescript-eslint/no-magic-numbers */
import { CachedFormula } from "@starbeam/reactive";
import { describe, expect, test } from "vitest";

import type { InventoryItem, TableRow } from "../index.js";
import { createInventory, createTable } from "../index.js";

interface Todo extends TableRow {
  readonly title: string;
  readonly done: boolean;
}

const APPLES: InventoryItem = {
  id: "apples",
  name: "Apples",
  category: "produce",
  price: 1.25,
  stock: 12,
};

const BREAD: InventoryItem = {
  id: "bread",
  name: "Bread",
  category: "bakery",
  price: 4,
  stock: 3,
};

describe("Table", () => {
  test("inserts, updates, deletes, and clears rows", () => {
    const table = createTable<Todo>();

    table.insert({ id: "write", title: "Write demo", done: false });
    table.insert({ id: "ship", title: "Ship demo", done: false });

    expect(table.size).toBe(2);
    expect(table.get("write")?.title).toBe("Write demo");

    table.update("write", (row) => ({ ...row, done: true }));
    expect(table.get("write")?.done).toBe(true);

    expect(table.delete("ship")).toBe(true);
    expect(table.rows.map((row) => row.id)).toEqual(["write"]);

    table.clear();
    expect(table.size).toBe(0);
  });

  test("derived formulas update as rows change", () => {
    const inventory = createInventory([APPLES, BREAD]);
    const lowStockNames = CachedFormula(() => {
      return inventory
        .view({ lowStockOnly: true })
        .rows.map((item) => item.name)
        .join(", ");
    });
    const value = CachedFormula(() => inventory.stats.inventoryValue);

    expect(lowStockNames.current).toBe("Bread");
    expect(value.current).toBe(27);

    inventory.restock("bread", 4);
    expect(lowStockNames.current).toBe("");
    expect(value.current).toBe(43);

    inventory.delete("apples");
    expect(value.current).toBe(28);
  });

  test("derived formulas update after clearing and repopulating", () => {
    const inventory = createInventory([APPLES, BREAD]);
    const names = CachedFormula(() => {
      return inventory.rows.map((item) => item.name).join(", ");
    });
    const stats = CachedFormula(() => inventory.stats);

    expect(names.current).toBe("Apples, Bread");
    expect(stats.current.totalItems).toBe(2);

    inventory.clear();

    expect(names.current).toBe("");
    expect(stats.current.totalItems).toBe(0);

    inventory.add({
      id: "milk",
      name: "Milk",
      category: "dairy",
      price: 5,
      stock: 6,
    });

    expect(names.current).toBe("Milk");
    expect(stats.current.totalItems).toBe(1);
    expect(stats.current.inventoryValue).toBe(30);
  });

  test("inventory views filter and sort the same core rows", () => {
    const inventory = createInventory([
      APPLES,
      BREAD,
      {
        id: "milk",
        name: "Milk",
        category: "dairy",
        price: 5,
        stock: 6,
      },
    ]);

    expect(
      inventory.view({ category: "bakery" }).rows.map((item) => item.name),
    ).toEqual(["Bread"]);

    expect(
      inventory.view({ sort: "stock" }).rows.map((item) => item.name),
    ).toEqual(["Bread", "Milk", "Apples"]);

    expect(inventory.stats.categories.get("produce")).toBe(1);
  });
});
