import type { InventoryItem } from "@starbeam-demos/table-core";
import { createInventory } from "@starbeam-demos/table-core";

export const STARTING_ITEMS: readonly InventoryItem[] = [
  {
    id: "apples",
    name: "Apples",
    category: "produce",
    price: 1.25,
    stock: 12,
  },
  {
    id: "bread",
    name: "Sourdough Bread",
    category: "bakery",
    price: 4,
    stock: 3,
  },
  {
    id: "coffee",
    name: "Coffee Beans",
    category: "pantry",
    price: 14,
    stock: 8,
  },
  {
    id: "milk",
    name: "Oat Milk",
    category: "dairy",
    price: 5,
    stock: 6,
  },
];

export const inventory = createInventory(STARTING_ITEMS);

export function resetInventory(): void {
  inventory.clear();

  for (const item of STARTING_ITEMS) {
    inventory.add(item);
  }
}
