import type {
  InventoryCategory,
  InventoryItem,
  InventoryViewOptions,
} from "@starbeam-demos/table-core";
import { LOW_STOCK_THRESHOLD } from "@starbeam-demos/table-core";
import type { VNode } from "preact";
import { useState } from "preact/hooks";

import { inventory, resetInventory } from "./demo.js";

const CATEGORIES: readonly InventoryCategory[] = [
  "produce",
  "bakery",
  "pantry",
  "dairy",
];

const CATEGORY_LABELS = {
  produce: "Produce",
  bakery: "Bakery",
  pantry: "Pantry",
  dairy: "Dairy",
} satisfies Record<InventoryCategory, string>;

type CategoryFilter = InventoryCategory | "all";
type SortMode = NonNullable<InventoryViewOptions["sort"]>;

const NO_ITEMS = 0;
const ONE_ITEM = 1;
let nextCustomItemId = 1;

export function App(): VNode {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("name");
  const [draftName, setDraftName] = useState("");

  const view = inventory.view({ category, lowStockOnly, search, sort });
  const stats = inventory.stats;

  const categoryCounts = CATEGORIES.map((itemCategory) => ({
    category: itemCategory,
    count: stats.categories.get(itemCategory) ?? NO_ITEMS,
  }));

  function addItem(): void {
    const name = draftName.trim();

    if (name === "") {
      return;
    }

    const id = createInventoryId(name);

    inventory.add({
      id,
      name,
      category: "pantry",
      price: 3,
      stock: 1,
    });
    setDraftName("");
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Starbeam demo</p>
        <h1>Reactive inventory table</h1>
        <p>
          The table model lives in a framework-neutral package. This Preact app
          reads it directly during render and calls model methods from event
          handlers.
        </p>
      </section>

      <section className="stats" aria-label="Inventory summary">
        <StatCard label="Items" value={stats.totalItems.toString()} />
        <StatCard label="Low stock" value={stats.lowStockCount.toString()} />
        <StatCard
          label="Inventory value"
          value={formatCurrency(stats.inventoryValue)}
        />
      </section>

      <section className="panel controls" aria-label="Inventory controls">
        <label>
          Search
          <input
            value={search}
            onInput={(event) => {
              setSearch(inputValue(event));
            }}
            placeholder="Filter by name"
          />
        </label>

        <label>
          Category
          <select
            value={category}
            onChange={(event) => {
              setCategory(selectValue(event) as CategoryFilter);
            }}
          >
            <option value="all">All</option>
            {CATEGORIES.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {CATEGORY_LABELS[itemCategory]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sort
          <select
            value={sort}
            onChange={(event) => {
              setSort(selectValue(event) as SortMode);
            }}
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="stock">Stock</option>
            <option value="value">Value</option>
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(event) => {
              setLowStockOnly(checkedValue(event));
            }}
          />
          Low stock only
        </label>

        <button
          className="button-secondary"
          type="button"
          onClick={resetInventory}
        >
          Restore data
        </button>
      </section>

      <div className="supporting-panels">
        <section className="panel add-item" aria-label="Add inventory item">
          <label>
            Add an item
            <input
              value={draftName}
              onInput={(event) => {
                setDraftName(inputValue(event));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addItem();
                }
              }}
              placeholder="Item name"
            />
          </label>
          <button className="button-primary" type="button" onClick={addItem}>
            Add
          </button>
        </section>

        <section className="panel category-counts" aria-label="Category counts">
          <h2>Categories</h2>
          <dl>
            {categoryCounts.map(({ category: itemCategory, count }) => (
              <div key={itemCategory}>
                <dt>{CATEGORY_LABELS[itemCategory]}</dt>
                <dd>{count}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="panel table-panel">
        <div className="table-header">
          <h2>Inventory</h2>
          <span>{formatItemCount(view.count)}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((item) => (
              <InventoryRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function createInventoryId(name: string): string {
  const slug = name.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");

  return `${slug}-${nextCustomItemId++}`;
}

function InventoryRow({ item }: { readonly item: InventoryItem }): VNode {
  const categoryId = `${item.id}-category`;
  const priceId = `${item.id}-price`;
  const stockId = `${item.id}-stock`;
  const isLowStock = item.stock <= LOW_STOCK_THRESHOLD;

  function updateItem(updater: (item: InventoryItem) => InventoryItem): void {
    inventory.update(item.id, updater);
  }

  return (
    <tr className={isLowStock ? "is-low-stock" : undefined}>
      <td>
        <input
          aria-label={`${item.name} name`}
          value={item.name}
          onInput={(event) => {
            updateItem((current) => ({
              ...current,
              name: inputValue(event),
            }));
          }}
        />
      </td>
      <td>
        <label className="sr-only" htmlFor={categoryId}>
          {item.name} category
        </label>
        <select
          id={categoryId}
          value={item.category}
          onChange={(event) => {
            updateItem((current) => ({
              ...current,
              category: selectValue(event) as InventoryCategory,
            }));
          }}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className="sr-only" htmlFor={priceId}>
          {item.name} price
        </label>
        <input
          id={priceId}
          type="number"
          min="0"
          step="0.25"
          value={item.price}
          onInput={(event) => {
            updateItem((current) => ({
              ...current,
              price: Number(inputValue(event)),
            }));
          }}
        />
      </td>
      <td>
        <label className="sr-only" htmlFor={stockId}>
          {item.name} stock
        </label>
        <input
          id={stockId}
          type="number"
          min="0"
          value={item.stock}
          onInput={(event) => {
            updateItem((current) => ({
              ...current,
              stock: Number(inputValue(event)),
            }));
          }}
        />
      </td>
      <td>
        <span className="row-value">
          {formatCurrency(item.price * item.stock)}
        </span>
      </td>
      <td>
        <button
          className="button-danger"
          type="button"
          onClick={() => {
            inventory.delete(item.id);
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function StatCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): VNode {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function inputValue(event: Event): string {
  return (event.currentTarget as HTMLInputElement).value;
}

function selectValue(event: Event): string {
  return (event.currentTarget as HTMLSelectElement).value;
}

function checkedValue(event: Event): boolean {
  return (event.currentTarget as HTMLInputElement).checked;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatItemCount(count: number): string {
  return count === ONE_ITEM ? "1 item shown" : `${count} items shown`;
}
