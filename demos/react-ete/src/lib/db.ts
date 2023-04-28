import { reactive } from "@starbeam/collections";
import type { Expand } from "@starbeam/interfaces";

export class Table<T = unknown, K extends string = string> {
  readonly #database: Database;
  readonly #rows = reactive.Map<string, T>();
  readonly #getId: (row: T) => string;

  constructor(database: Database, readonly name: K, getId: (row: T) => string) {
    this.#database = database;
    this.#getId = getId;
  }

  get refs(): readonly RowRef<T>[] {
    return [...this.#rows.keys()].map(
      (id) => new RowRef(this.#database, this.name, id)
    );
  }

  get ids(): readonly string[] {
    return [...this.#rows.keys()];
  }

  get rows(): readonly T[] {
    return [...this.#rows.values()];
  }

  add(row: T): this {
    this.#rows.set(this.#getId(row), row);
    return this;
  }

  get(id: string): T | undefined {
    return this.#rows.get(id);
  }

  delete(id: string): boolean {
    return this.#rows.delete(id);
  }
}

type TablesRecord = Record<string, unknown>;

export class RowRef<T> {
  readonly #database: Database;

  constructor(database: Database, readonly table: string, readonly id: string) {
    this.#database = database;
  }

  deref(): T {
    return this.#database.get(this.table).get(this.id) as T;
  }
}

export const Row = {};

export type DbTables<D extends Database> = D extends Database<infer T>
  ? keyof T & string
  : never;

export class Database<Tables extends TablesRecord = TablesRecord> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  static create(): Database<{}> {
    return new Database(reactive.object({}));
  }

  readonly #tables: Tables;

  constructor(tables: Tables) {
    this.#tables = tables;
  }

  get tables(): (keyof Tables)[] {
    return Object.keys(this.#tables) as (keyof Tables)[];
  }

  ref<K extends keyof Tables & string>(
    table: K,
    id: string
  ): RowRef<Tables[K]> {
    return new RowRef(this as Database, table, id);
  }

  add<K extends keyof Tables>(tableName: K, ...rows: Tables[K][]): void {
    const table = this.get(tableName);
    for (const row of rows) {
      table.add(row);
    }
  }

  get<K extends keyof Tables>(table: K): Table<Tables[K]> {
    return this.#tables[table] as Table<Tables[K]>;
  }

  define<K extends string, T extends { readonly id: string }>(
    key: K,
    type: T
  ): Database<Expand<Tables & Record<K, T>>>;
  define<K extends string, T>(
    key: K,
    type: T,
    getId: (value: T) => string
  ): Database<Expand<Tables & Record<K, T>>>;
  define(
    key: string,
    _type: unknown,
    getId?: (row: unknown) => string
  ): Database<any> {
    (this.#tables as any)[key] = new Table(
      this as Database,
      key,
      getId ?? ((row) => (row as { id: string }).id)
    );
    return this as Database;
  }
}
