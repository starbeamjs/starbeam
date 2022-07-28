import { entryPoint } from "@starbeam/debug";
import { reactive } from "@starbeam/js";

export type Row<T> = {
  id: string;
} & T;

export class Table<T> {
  #id = 0;
  #rows: Map<string, Row<T>> = reactive.Map("table");

  constructor(readonly columns: (keyof T)[]) {}

  get rows(): Row<T>[] {
    return [...this.#rows.values()];
  }

  append(columns: T): Row<T> {
    const id = String(this.#id++);
    const row = { id, ...columns };
    this.#rows.set(String(id), row);
    return row;
  }

  delete(id: string): void {
    this.#rows.delete(id);
  }

  clear() {
    this.#rows.clear();
  }

  query(): Query<T> {
    return new Query(this);
  }
}

export type Filter<T> = (row: Row<T>) => boolean;
export type Sort<T> = (rowA: Row<T>, rowB: Row<T>) => number;

export class Query<T> {
  #table: Table<T>;
  #filters: Filter<T>[];
  #sort?: Sort<T>;

  constructor(table: Table<T>, filters: Filter<T>[] = [], sort?: Sort<T>) {
    this.#table = table;
    this.#filters = filters;
    this.#sort = sort;
  }

  filter(filter: Filter<T>): Query<T> {
    return new Query(this.#table, [...this.#filters, filter], this.#sort);
  }

  sort(sort: Sort<T>): Query<T> {
    return new Query(this.#table, this.#filters, sort);
  }

  get rows(): Row<T>[] {
    return entryPoint(() => {
      const filtered = this.#table.rows.filter((row) =>
        this.#filters.every((filter) => filter(row))
      );

      if (this.#sort) {
        return filtered.sort(this.#sort);
      } else {
        return filtered;
      }
    });
  }
}
