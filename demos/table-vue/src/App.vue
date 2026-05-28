<script setup lang="ts">
import { useReactive } from "@starbeam/vue";
import type {
  InventoryCategory,
  InventoryItem,
  InventoryViewOptions,
} from "@starbeam-demos/table-core";
import { LOW_STOCK_THRESHOLD } from "@starbeam-demos/table-core";
import { ref } from "vue";

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

useReactive();

const category = ref<CategoryFilter>("all");
const lowStockOnly = ref(false);
const search = ref("");
const sort = ref<SortMode>("name");
const draftName = ref("");

function currentView() {
  return inventory.view({
    category: category.value,
    lowStockOnly: lowStockOnly.value,
    search: search.value,
    sort: sort.value,
  });
}

function categoryCount(itemCategory: InventoryCategory): number {
  return inventory.stats.categories.get(itemCategory) ?? NO_ITEMS;
}

function addItem(): void {
  const name = draftName.value.trim();

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
  draftName.value = "";
}

function createInventoryId(name: string): string {
  const slug = name.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "-");

  return `${slug}-${nextCustomItemId++}`;
}

function updateItem(
  item: InventoryItem,
  updater: (item: InventoryItem) => InventoryItem,
): void {
  inventory.update(item.id, updater);
}

function updateItemName(item: InventoryItem, value: string): void {
  updateItem(item, (current) => ({ ...current, name: value }));
}

function updateItemCategory(item: InventoryItem, value: string): void {
  updateItem(item, (current) => ({
    ...current,
    category: value as InventoryCategory,
  }));
}

function updateItemPrice(item: InventoryItem, value: string): void {
  updateItem(item, (current) => ({ ...current, price: Number(value) }));
}

function updateItemStock(item: InventoryItem, value: string): void {
  updateItem(item, (current) => ({ ...current, stock: Number(value) }));
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
</script>

<template>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Starbeam demo</p>
      <h1>Reactive inventory table</h1>
      <p>
        The table model lives in a framework-neutral package. This Vue app reads
        it directly from the template and calls model methods from event
        handlers.
      </p>
    </section>

    <section class="stats" aria-label="Inventory summary">
      <article class="stat-card">
        <span>Items</span>
        <strong>{{ inventory.stats.totalItems }}</strong>
      </article>
      <article class="stat-card">
        <span>Low stock</span>
        <strong>{{ inventory.stats.lowStockCount }}</strong>
      </article>
      <article class="stat-card">
        <span>Inventory value</span>
        <strong>{{ formatCurrency(inventory.stats.inventoryValue) }}</strong>
      </article>
    </section>

    <section class="panel controls" aria-label="Inventory controls">
      <label>
        Search
        <input v-model="search" placeholder="Filter by name" />
      </label>

      <label>
        Category
        <select v-model="category">
          <option value="all">All</option>
          <option
            v-for="itemCategory of CATEGORIES"
            :key="itemCategory"
            :value="itemCategory"
          >
            {{ CATEGORY_LABELS[itemCategory] }}
          </option>
        </select>
      </label>

      <label>
        Sort
        <select v-model="sort">
          <option value="name">Name</option>
          <option value="category">Category</option>
          <option value="stock">Stock</option>
          <option value="value">Value</option>
        </select>
      </label>

      <label class="checkbox">
        <input v-model="lowStockOnly" type="checkbox" />
        Low stock only
      </label>

      <button class="button-secondary" type="button" @click="resetInventory">
        Restore data
      </button>
    </section>

    <div class="supporting-panels">
      <section class="panel add-item" aria-label="Add inventory item">
        <label>
          Add an item
          <input
            v-model="draftName"
            placeholder="Item name"
            @keydown.enter="addItem"
          />
        </label>
        <button class="button-primary" type="button" @click="addItem">
          Add
        </button>
      </section>

      <section class="panel category-counts" aria-label="Category counts">
        <h2>Categories</h2>
        <dl>
          <div v-for="itemCategory of CATEGORIES" :key="itemCategory">
            <dt>{{ CATEGORY_LABELS[itemCategory] }}</dt>
            <dd>{{ categoryCount(itemCategory) }}</dd>
          </div>
        </dl>
      </section>
    </div>

    <section class="panel table-panel">
      <div class="table-header">
        <h2>Inventory</h2>
        <span>{{ formatItemCount(currentView().count) }}</span>
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
          <tr
            v-for="item of currentView().rows"
            :key="item.id"
            :class="{ 'is-low-stock': item.stock <= LOW_STOCK_THRESHOLD }"
          >
            <td>
              <input
                :aria-label="`${item.name} name`"
                :value="item.name"
                @input="
                  updateItemName(
                    item,
                    ($event.currentTarget as HTMLInputElement).value,
                  )
                "
              />
            </td>
            <td>
              <label class="sr-only" :for="`${item.id}-category`">
                {{ item.name }} category
              </label>
              <select
                :id="`${item.id}-category`"
                :value="item.category"
                @change="
                  updateItemCategory(
                    item,
                    ($event.currentTarget as HTMLSelectElement).value,
                  )
                "
              >
                <option
                  v-for="itemCategory of CATEGORIES"
                  :key="itemCategory"
                  :value="itemCategory"
                >
                  {{ CATEGORY_LABELS[itemCategory] }}
                </option>
              </select>
            </td>
            <td>
              <label class="sr-only" :for="`${item.id}-price`">
                {{ item.name }} price
              </label>
              <input
                :id="`${item.id}-price`"
                type="number"
                min="0"
                step="0.25"
                :value="item.price"
                @input="
                  updateItemPrice(
                    item,
                    ($event.currentTarget as HTMLInputElement).value,
                  )
                "
              />
            </td>
            <td>
              <label class="sr-only" :for="`${item.id}-stock`">
                {{ item.name }} stock
              </label>
              <input
                :id="`${item.id}-stock`"
                type="number"
                min="0"
                :value="item.stock"
                @input="
                  updateItemStock(
                    item,
                    ($event.currentTarget as HTMLInputElement).value,
                  )
                "
              />
            </td>
            <td>
              <span class="row-value">
                {{ formatCurrency(item.price * item.stock) }}
              </span>
            </td>
            <td>
              <button
                class="button-danger"
                type="button"
                @click="inventory.delete(item.id)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>
