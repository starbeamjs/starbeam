<script lang="ts">
  import { fromStarbeam } from "@starbeam/svelte";
  import type {
    InventoryCategory,
    InventoryItem,
    InventoryViewOptions,
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
  let nextCustomItemId = 1;

  let category = $state<CategoryFilter>("all");
  let lowStockOnly = $state(false);
  let search = $state("");
  let sort = $state<SortMode>("name");
  let draftName = $state("");

  const inventoryView = fromStarbeam(() =>
    inventory.view({ category, lowStockOnly, search, sort }),
  );
  const inventoryStats = fromStarbeam(() => inventory.stats);

  const view = $derived(inventoryView.current);
  const stats = $derived(inventoryStats.current);

  function categoryCount(itemCategory: InventoryCategory): number {
    return stats.categories.get(itemCategory) ?? NO_ITEMS;
  }

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
    draftName = "";
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

  function inputValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  function selectValue(event: Event): string {
    return (event.currentTarget as HTMLSelectElement).value;
  }

  function addItemOnEnter(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      addItem();
    }
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

<main class="shell">
  <section class="hero">
    <p class="eyebrow">Starbeam demo</p>
    <h1>Reactive inventory table</h1>
    <p>
      The table model lives in a framework-neutral package. This Svelte app reads
      it through <code>fromStarbeam()</code> and calls model methods from event
      handlers.
    </p>
  </section>

  <section class="stats" aria-label="Inventory summary">
    <article class="stat-card">
      <span>Items</span>
      <strong>{stats.totalItems}</strong>
    </article>
    <article class="stat-card">
      <span>Low stock</span>
      <strong>{stats.lowStockCount}</strong>
    </article>
    <article class="stat-card">
      <span>Inventory value</span>
      <strong>{formatCurrency(stats.inventoryValue)}</strong>
    </article>
  </section>

  <section class="panel controls" aria-label="Inventory controls">
    <label>
      Search
      <input bind:value={search} placeholder="Filter by name" />
    </label>

    <label>
      Category
      <select bind:value={category}>
        <option value="all">All</option>
        {#each CATEGORIES as itemCategory}
          <option value={itemCategory}>{CATEGORY_LABELS[itemCategory]}</option>
        {/each}
      </select>
    </label>

    <label>
      Sort
      <select bind:value={sort}>
        <option value="name">Name</option>
        <option value="category">Category</option>
        <option value="stock">Stock</option>
        <option value="value">Value</option>
      </select>
    </label>

    <label class="checkbox">
      <input bind:checked={lowStockOnly} type="checkbox" />
      Low stock only
    </label>

    <button class="button-secondary" type="button" onclick={resetInventory}>
      Restore data
    </button>
  </section>

  <div class="supporting-panels">
    <section class="panel add-item" aria-label="Add inventory item">
      <label>
        Add an item
        <input
          bind:value={draftName}
          placeholder="Item name"
          onkeydown={addItemOnEnter}
        />
      </label>
      <button class="button-primary" type="button" onclick={addItem}>
        Add
      </button>
    </section>

    <section class="panel category-counts" aria-label="Category counts">
      <h2>Categories</h2>
      <dl>
        {#each CATEGORIES as itemCategory}
          <div>
            <dt>{CATEGORY_LABELS[itemCategory]}</dt>
            <dd>{categoryCount(itemCategory)}</dd>
          </div>
        {/each}
      </dl>
    </section>
  </div>

  <section class="panel table-panel">
    <div class="table-header">
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
        {#each view.rows as item (item.id)}
          <tr class={item.stock <= LOW_STOCK_THRESHOLD ? "is-low-stock" : ""}>
            <td>
              <input
                aria-label={`${item.name} name`}
                value={item.name}
                oninput={(event) => updateItemName(item, inputValue(event))}
              />
            </td>
            <td>
              <label class="sr-only" for={`${item.id}-category`}>
                {item.name} category
              </label>
              <select
                id={`${item.id}-category`}
                value={item.category}
                onchange={(event) => updateItemCategory(item, selectValue(event))}
              >
                {#each CATEGORIES as itemCategory}
                  <option value={itemCategory}>{CATEGORY_LABELS[itemCategory]}</option>
                {/each}
              </select>
            </td>
            <td>
              <label class="sr-only" for={`${item.id}-price`}>
                {item.name} price
              </label>
              <input
                id={`${item.id}-price`}
                type="number"
                min="0"
                step="0.25"
                value={item.price}
                oninput={(event) => updateItemPrice(item, inputValue(event))}
              />
            </td>
            <td>
              <label class="sr-only" for={`${item.id}-stock`}>
                {item.name} stock
              </label>
              <input
                id={`${item.id}-stock`}
                type="number"
                min="0"
                value={item.stock}
                oninput={(event) => updateItemStock(item, inputValue(event))}
              />
            </td>
            <td>
              <span class="row-value">
                {formatCurrency(item.price * item.stock)}
              </span>
            </td>
            <td>
              <button
                class="button-danger"
                type="button"
                onclick={() => inventory.delete(item.id)}
              >
                Delete
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
</main>