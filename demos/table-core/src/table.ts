import { reactive } from "@starbeam/collections";

export type RowId = string;

export interface TableRow {
  readonly id: RowId;
}

export interface ViewOptions<Row extends TableRow> {
  readonly filter?: (row: Row) => boolean;
  readonly sort?: (left: Row, right: Row) => number;
}

export interface TableView<Row extends TableRow> {
  readonly rows: readonly Row[];
  readonly count: number;
}

export class Table<Row extends TableRow> {
  readonly #rows = reactive.Map<RowId, Row>("table rows");

  #rowArray(): Row[] {
    return [...this.#rows.values()];
  }

  get size(): number {
    return this.#rows.size;
  }

  get rows(): readonly Row[] {
    return this.#rowArray();
  }

  clear(): void {
    this.#rows.clear();
  }

  delete(id: RowId): boolean {
    return this.#rows.delete(id);
  }

  get(id: RowId): Row | undefined {
    return this.#rows.get(id);
  }

  insert(row: Row): void {
    if (this.#rows.has(row.id)) {
      throw new Error(`Row already exists: ${row.id}`);
    }

    this.#rows.set(row.id, row);
  }

  update(id: RowId, updater: (row: Row) => Row): Row {
    const row = this.#rows.get(id);

    if (!row) {
      throw new Error(`Row not found: ${id}`);
    }

    const next = updater(row);

    if (next.id !== id) {
      throw new Error("Table.update() cannot change a row id");
    }

    this.#rows.set(id, next);
    return next;
  }

  upsert(row: Row): void {
    this.#rows.set(row.id, row);
  }

  view(options: ViewOptions<Row> = {}): TableView<Row> {
    let rows = this.#rowArray();

    if (options.filter) {
      rows = rows.filter(options.filter);
    }

    if (options.sort) {
      rows = rows.sort(options.sort);
    }

    return { rows, count: rows.length };
  }
}

export function createTable<Row extends TableRow>(): Table<Row> {
  return new Table<Row>();
}

export type InventoryCategory = "produce" | "bakery" | "pantry" | "dairy";

export interface InventoryItem extends TableRow {
  readonly name: string;
  readonly category: InventoryCategory;
  readonly price: number;
  readonly stock: number;
}

export interface InventoryStats {
  readonly categories: ReadonlyMap<InventoryCategory, number>;
  readonly inventoryValue: number;
  readonly lowStockCount: number;
  readonly totalItems: number;
}

const EMPTY_COUNT = 0;
const ONE_ITEM = 1;
export const LOW_STOCK_THRESHOLD = 5;

export class Inventory {
  readonly #table = createTable<InventoryItem>();

  get rows(): readonly InventoryItem[] {
    return this.#table.rows;
  }

  get stats(): InventoryStats {
    const categories = new Map<InventoryCategory, number>();
    const rows = this.rows;
    let inventoryValue = 0;
    let lowStockCount = 0;

    for (const item of rows) {
      categories.set(
        item.category,
        (categories.get(item.category) ?? EMPTY_COUNT) + ONE_ITEM,
      );
      inventoryValue += item.price * item.stock;

      if (item.stock <= LOW_STOCK_THRESHOLD) {
        lowStockCount++;
      }
    }

    return {
      categories,
      inventoryValue,
      lowStockCount,
      totalItems: rows.length,
    };
  }

  add(item: InventoryItem): void {
    this.#table.insert(item);
  }

  clear(): void {
    this.#table.clear();
  }

  delete(id: RowId): boolean {
    return this.#table.delete(id);
  }

  find(id: RowId): InventoryItem | undefined {
    return this.#table.get(id);
  }

  restock(id: RowId, amount: number): InventoryItem {
    return this.update(id, (item) => ({ ...item, stock: item.stock + amount }));
  }

  update(
    id: RowId,
    updater: (item: InventoryItem) => InventoryItem,
  ): InventoryItem {
    return this.#table.update(id, updater);
  }

  upsert(item: InventoryItem): void {
    this.#table.upsert(item);
  }

  view(options: InventoryViewOptions = {}): TableView<InventoryItem> {
    return this.#table.view({
      filter: (item) => matchesInventoryFilters(item, options),
      sort: sortInventory(options.sort),
    });
  }
}

export interface InventoryViewOptions {
  readonly category?: InventoryCategory | "all";
  readonly lowStockOnly?: boolean;
  readonly search?: string;
  readonly sort?: "name" | "category" | "stock" | "value";
}

export function createInventory(
  items: Iterable<InventoryItem> = [],
): Inventory {
  const inventory = new Inventory();

  for (const item of items) {
    inventory.add(item);
  }

  return inventory;
}

function matchesInventoryFilters(
  item: InventoryItem,
  options: InventoryViewOptions,
): boolean {
  if (options.category && options.category !== "all") {
    if (item.category !== options.category) {
      return false;
    }
  }

  if (options.lowStockOnly === true && item.stock > LOW_STOCK_THRESHOLD) {
    return false;
  }

  if (options.search) {
    return item.name.toLowerCase().includes(options.search.toLowerCase());
  }

  return true;
}

function sortInventory(
  sort: InventoryViewOptions["sort"] = "name",
): (left: InventoryItem, right: InventoryItem) => number {
  switch (sort) {
    case "category":
      return (left, right) =>
        left.category.localeCompare(right.category) ||
        left.name.localeCompare(right.name);
    case "stock":
      return (left, right) => left.stock - right.stock;
    case "value":
      return (left, right) =>
        right.price * right.stock - left.price * left.stock;
    case "name":
      return (left, right) => left.name.localeCompare(right.name);
  }
}
