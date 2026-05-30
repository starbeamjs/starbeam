import { on } from "@ember/modifier";
import { tracked } from "@glimmer/tracking";
import Component from "@glimmer/component";
import type {
  InventoryCategory,
  InventoryItem,
  InventoryStats,
  InventoryViewOptions,
  TableView,
} from "@starbeam-demos/table-core";
import { LOW_STOCK_THRESHOLD } from "@starbeam-demos/table-core";

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

function categoryLabel(category: InventoryCategory): string {
  return CATEGORY_LABELS[category];
}

function categoryCount(stats: InventoryStats, category: InventoryCategory): number {
  return stats.categories.get(category) ?? NO_ITEMS;
}

function isLowStock(item: InventoryItem): boolean {
  return item.stock <= LOW_STOCK_THRESHOLD;
}

function rowClass(item: InventoryItem): string {
  return isLowStock(item) ? "is-low-stock" : "";
}

function categoryId(item: InventoryItem): string {
  return `${item.id}-category`;
}

function priceId(item: InventoryItem): string {
  return `${item.id}-price`;
}

function stockId(item: InventoryItem): string {
  return `${item.id}-stock`;
}

function nameLabel(item: InventoryItem): string {
  return `${item.name} name`;
}

function rowValue(item: InventoryItem): string {
  return formatCurrency(item.price * item.stock);
}

function inputValue(event: Event): string {
  return (event.currentTarget as HTMLInputElement).value;
}

function selectValue(event: Event): string {
  return (event.currentTarget as HTMLSelectElement).value;
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

let nextCustomItemId = 1;

export default class App extends Component {
  @tracked category: CategoryFilter = "all";
  @tracked lowStockOnly = false;
  @tracked search = "";
  @tracked sort: SortMode = "name";
  @tracked draftName = "";

  get view(): TableView<InventoryItem> {
    return inventory.view({
      category: this.category,
      lowStockOnly: this.lowStockOnly,
      search: this.search,
      sort: this.sort,
    });
  }

  get stats(): InventoryStats {
    return inventory.stats;
  }

  get itemCountLabel(): string {
    return formatItemCount(this.view.count);
  }

  resetInventory = (): void => {
    resetInventory();
  };

  updateSearch = (event: Event): void => {
    this.search = inputValue(event);
  };

  updateCategory = (event: Event): void => {
    this.category = selectValue(event) as CategoryFilter;
  };

  updateSort = (event: Event): void => {
    this.sort = selectValue(event) as SortMode;
  };

  updateLowStockOnly = (event: Event): void => {
    this.lowStockOnly = (event.currentTarget as HTMLInputElement).checked;
  };

  updateDraftName = (event: Event): void => {
    this.draftName = inputValue(event);
  };

  addItem = (): void => {
    const name = this.draftName.trim();

    if (name === "") {
      return;
    }

    const id = this.createInventoryId(name);

    inventory.add({
      id,
      name,
      category: "pantry",
      price: 3,
      stock: 1,
    });
    this.draftName = "";
  };

  addItemOnEnter = (event: KeyboardEvent): void => {
    if (event.key === "Enter") {
      this.addItem();
    }
  };

  createInventoryId(name: string): string {
    const slug = name.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");

    return `${slug}-${nextCustomItemId++}`;
  }

  updateItem = (
    item: InventoryItem,
    updater: (item: InventoryItem) => InventoryItem,
  ): void => {
    inventory.update(item.id, updater);
  };

  updateItemName = (item: InventoryItem, event: Event): void => {
    const value = inputValue(event);
    this.updateItem(item, (current) => ({ ...current, name: value }));
  };

  updateItemCategory = (item: InventoryItem, event: Event): void => {
    const value = selectValue(event) as InventoryCategory;
    this.updateItem(item, (current) => ({ ...current, category: value }));
  };

  updateItemPrice = (item: InventoryItem, event: Event): void => {
    const value = Number(inputValue(event));
    this.updateItem(item, (current) => ({ ...current, price: value }));
  };

  updateItemStock = (item: InventoryItem, event: Event): void => {
    const value = Number(inputValue(event));
    this.updateItem(item, (current) => ({ ...current, stock: value }));
  };

  deleteItem = (item: InventoryItem): void => {
    inventory.delete(item.id);
  };

  <template>
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">Starbeam demo</p>
        <h1>Reactive inventory table</h1>
        <p>
          The table model lives in a framework-neutral package. This Ember app
          reads it directly from plain Glimmer getters and calls model methods
          from event handlers.
        </p>
      </section>

      <section class="stats" aria-label="Inventory summary">
        <article class="stat-card">
          <span>Items</span>
          <strong>{{this.stats.totalItems}}</strong>
        </article>
        <article class="stat-card">
          <span>Low stock</span>
          <strong>{{this.stats.lowStockCount}}</strong>
        </article>
        <article class="stat-card">
          <span>Inventory value</span>
          <strong>{{formatCurrency this.stats.inventoryValue}}</strong>
        </article>
      </section>

      <section class="panel controls" aria-label="Inventory controls">
        <label>
          Search
          <input
            value={{this.search}}
            placeholder="Filter by name"
            {{on "input" this.updateSearch}}
          />
        </label>

        <label>
          Category
          <select {{on "change" this.updateCategory}}>
            <option value="all" selected={{this.isAll}}>All</option>
            {{#each CATEGORIES as |itemCategory|}}
              <option
                value={{itemCategory}}
                selected={{this.isSelectedCategory itemCategory}}
              >
                {{categoryLabel itemCategory}}
              </option>
            {{/each}}
          </select>
        </label>

        <label>
          Sort
          <select {{on "change" this.updateSort}}>
            <option value="name" selected={{this.isSortName}}>Name</option>
            <option value="category" selected={{this.isSortCategory}}>Category</option>
            <option value="stock" selected={{this.isSortStock}}>Stock</option>
            <option value="value" selected={{this.isSortValue}}>Value</option>
          </select>
        </label>

        <label class="checkbox">
          <input
            type="checkbox"
            checked={{this.lowStockOnly}}
            {{on "change" this.updateLowStockOnly}}
          />
          Low stock only
        </label>

        <button
          class="button-secondary"
          type="button"
          {{on "click" this.resetInventory}}
        >
          Restore data
        </button>
      </section>

      <div class="supporting-panels">
        <section class="panel add-item" aria-label="Add inventory item">
          <label>
            Add an item
            <input
              value={{this.draftName}}
              placeholder="Item name"
              {{on "input" this.updateDraftName}}
              {{on "keydown" this.addItemOnEnter}}
            />
          </label>
          <button class="button-primary" type="button" {{on "click" this.addItem}}>
            Add
          </button>
        </section>

        <section class="panel category-counts" aria-label="Category counts">
          <h2>Categories</h2>
          <dl>
            {{#each CATEGORIES as |itemCategory|}}
              <div>
                <dt>{{categoryLabel itemCategory}}</dt>
                <dd>{{categoryCount this.stats itemCategory}}</dd>
              </div>
            {{/each}}
          </dl>
        </section>
      </div>

      <section class="panel table-panel">
        <div class="table-header">
          <h2>Inventory</h2>
          <span>{{this.itemCountLabel}}</span>
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
            {{#each this.view.rows key="id" as |item|}}
              <tr class={{rowClass item}}>
                <td>
                  <input
                    aria-label={{nameLabel item}}
                    value={{item.name}}
                    {{on "input" (this.bindUpdate this.updateItemName item)}}
                  />
                </td>
                <td>
                  <label class="sr-only" for={{categoryId item}}>
                    {{item.name}} category
                  </label>
                  <select
                    id={{categoryId item}}
                    {{on "change" (this.bindUpdate this.updateItemCategory item)}}
                  >
                    {{#each CATEGORIES as |itemCategory|}}
                      <option
                        value={{itemCategory}}
                        selected={{this.isItemCategory item itemCategory}}
                      >
                        {{categoryLabel itemCategory}}
                      </option>
                    {{/each}}
                  </select>
                </td>
                <td>
                  <label class="sr-only" for={{priceId item}}>
                    {{item.name}} price
                  </label>
                  <input
                    id={{priceId item}}
                    type="number"
                    min="0"
                    step="0.25"
                    value={{item.price}}
                    {{on "input" (this.bindUpdate this.updateItemPrice item)}}
                  />
                </td>
                <td>
                  <label class="sr-only" for={{stockId item}}>
                    {{item.name}} stock
                  </label>
                  <input
                    id={{stockId item}}
                    type="number"
                    min="0"
                    value={{item.stock}}
                    {{on "input" (this.bindUpdate this.updateItemStock item)}}
                  />
                </td>
                <td>
                  <span class="row-value">
                    {{rowValue item}}
                  </span>
                </td>
                <td>
                  <button
                    class="button-danger"
                    type="button"
                    {{on "click" (this.bindDelete item)}}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            {{/each}}
          </tbody>
        </table>
      </section>
    </main>
  </template>

  get isAll(): boolean {
    return this.category === "all";
  }

  isSelectedCategory = (category: InventoryCategory): boolean => {
    return this.category === category;
  };

  isItemCategory = (item: InventoryItem, category: InventoryCategory): boolean => {
    return item.category === category;
  };

  get isSortName(): boolean {
    return this.sort === "name";
  }

  get isSortCategory(): boolean {
    return this.sort === "category";
  }

  get isSortStock(): boolean {
    return this.sort === "stock";
  }

  get isSortValue(): boolean {
    return this.sort === "value";
  }

  bindUpdate = (
    handler: (item: InventoryItem, event: Event) => void,
    item: InventoryItem,
  ): ((event: Event) => void) => {
    return (event: Event) => handler(item, event);
  };

  bindDelete = (item: InventoryItem): (() => void) => {
    return () => this.deleteItem(item);
  };
}
