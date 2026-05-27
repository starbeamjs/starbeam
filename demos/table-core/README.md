# Starbeam table demo core

Framework-neutral demo model for a small inventory table. The package has two
layers:

- `Table<Row>` is the reusable reactive table primitive.
- `Inventory` is a domain wrapper that shows how an app can expose a small,
  database-like API above that primitive.

The important Starbeam idea is that the public API stays ordinary JavaScript.
Call methods that look like writes to a tiny in-memory database, and reads like
`inventory.view(...)` and `inventory.stats` update because the table uses
reactive maps internally.

```ts
import { createTable } from "@starbeam-demos/table-core";

const table = createTable<{ id: string; title: string; done: boolean }>();

table.insert({ id: "write", title: "Write demo", done: false });
table.update("write", (row) => ({ ...row, done: true }));

console.log(table.rows);
```

The inventory wrapper is the first playable demo domain:

```ts
import { createInventory } from "@starbeam-demos/table-core";

const inventory = createInventory();
inventory.add({
  id: "apples",
  name: "Apples",
  category: "produce",
  price: 1.25,
  stock: 12,
});

inventory.restock("apples", 3);
console.log(inventory.stats.inventoryValue);
```

Framework apps can read the same model from their own adapter layer without
importing framework code here. The React demo imports this package directly; the
Preact, Vue, Svelte, and Ember demos can do the same later.
