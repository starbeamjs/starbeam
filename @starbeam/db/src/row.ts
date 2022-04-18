import { reactive } from "@starbeam/core";
import type { AnyRecord, InferReturn } from "@starbeam/fundamental";
import { Reference } from "./reference.js";
import type { Table, TableType } from "./table.js";

export class Row<T extends TableType = TableType, Id extends string = string> {
  /**
   * Instantiate a new row that has an ID and columns.
   */
  static instantiate<T extends TableType, Id extends string>(
    table: Table<T>,
    id: Id,
    columns: T["columns"]
  ): Row<T, Id> {
    return new Row(table, id, reactive({ ...columns }));
  }

  static columns<T extends TableType>(row: Row<T>): T["columns"] {
    return row.#columns;
  }

  static mutate<T extends TableType>(row: Row<T>): T["columns"] {
    return row.#columns;
  }

  readonly #table: Table<T>;
  readonly #id: Id;
  readonly #columns: T["columns"];

  private constructor(table: Table<T>, id: Id, columns: T["columns"]) {
    this.#table = table;
    this.#id = id;
    this.#columns = columns;
  }

  get reference(): Reference<T, Id> {
    return Reference.create(this.#table, this.#id);
  }

  get id(): string {
    return this.#id;
  }

  get columns(): Readonly<T["columns"]> {
    return this.#columns;
  }

  /**
   * Mutate the columns of this row.
   *
   * @param mutator A function that mutates the columns of this row, given a draft.
   */
  mutate(update: (draft: DraftForUpdate<T>) => void): void {
    const draft = this.draft;
    update(draft);
    draft.commit();
  }

  get draft(): DraftForUpdate<T> {
    return DraftForUpdate.of(this);
  }
}

export class DraftForUpdate<T extends TableType> {
  static of<T extends TableType>(row: Row<T>): DraftForUpdate<T> {
    const snapshot = { ...Row.columns(row) };
    return new DraftForUpdate(row, snapshot, snapshot);
  }

  readonly #row: Row<T>;
  readonly #columns: T["columns"];
  readonly #original: T["columns"];

  private constructor(
    row: Row<T>,
    columns: T["columns"],
    original: T["columns"]
  ) {
    this.#row = row;
    this.#columns = columns;
    this.#original = original;
  }

  get id(): string {
    return this.#row.id;
  }

  get columns(): Readonly<T["columns"]> {
    return this.#columns;
  }

  get mutate(): T["columns"] {
    return this.#columns;
  }

  commit() {
    let mutate = Row.mutate(this.#row);
    let columns = this.#columns;
    let original = this.#original;

    for (let key of keys(columns)) {
      original[key] = mutate[key] = columns[key];
    }
  }
}

export type RowClass<
  T extends TableType = TableType,
  R extends Row<T> = Row<T>
> = {
  instantiate<T extends TableType>(
    table: Table<T>,
    id: string,
    columns: T["columns"]
  ): R;
};

export class DraftForNew<T extends TableType, Id extends string | null> {
  static create<T extends TableType, Id extends string | null>(
    table: Table<T>,
    id: Id
  ): DraftForNew<T, Id> {
    return new DraftForNew(
      table,
      id ?? (null as Id),
      reactive({}) as Partial<T["columns"]>
    );
  }

  readonly #table: Table<T>;
  readonly #id: Id;
  readonly #columns: Partial<T["columns"]>;

  private constructor(table: Table<T>, id: Id, columns: T["columns"]) {
    this.#table = table;
    this.#id = id;
    this.#columns = columns;
  }

  get id(): string | null {
    return this.#columns["id"] ?? null;
  }

  get columns(): Readonly<Partial<T["columns"]>> {
    return this.#columns as InferReturn;
  }

  get mutate(): Partial<T["columns"]> {
    return this.#columns as InferReturn;
  }

  insert(this: DraftForNew<T, string>): Row<T>;
  insert(id: string): Row<T>;
  insert(id?: any): Row<T> {
    // TODO: Validate the columns
    return this.#table.create(this.#id ?? id, this.#columns as T["columns"]);
  }
}

export type DraftRecord<C extends AnyRecord> = {
  -readonly [P in keyof C]?: C[P];
};

export type DraftRecordFor<R extends Row> = R extends Row<infer C>
  ? {
      -readonly [P in keyof C]?: C[P];
    }
  : never;

export function keys<T extends object>(object: T): Iterable<keyof T> {
  return Object.keys(object) as Iterable<keyof T>;
}
