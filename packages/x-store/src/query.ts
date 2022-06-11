import { type Filter, type FilterInstance, filter } from "./filter.js";
import { FlatRows } from "./flat.js";
import type { Table, TableTypes } from "./table.js";

type Sort<T extends TableTypes> = (a: T["Row"], b: T["Row"]) => number;

export class Query<T extends TableTypes> extends FlatRows<T> {
  static for<T extends TableTypes>(table: Table<T>): Query<T> {
    return new Query(table, filter.unfiltered(), undefined);
  }

  #table: Table<T>;
  #filter: FilterInstance<T>;
  #sort: Sort<T> | undefined;

  constructor(
    table: Table<T>,
    filter: FilterInstance<T>,
    sort: Sort<T> | undefined
  ) {
    super();
    this.#table = table;
    this.#filter = filter;
    this.#sort = sort;
  }

  filter(filter: Filter<T>): Query<T> {
    return new Query(this.#table, this.#filter.and(filter), this.#sort);
  }

  and(...filters: Filter<T>[]): Query<T> {
    return new Query(this.#table, this.#filter.and(...filters), this.#sort);
  }

  or(...filters: Filter<T>[]): Query<T> {
    return new Query(this.#table, this.#filter.or(...filters), this.#sort);
  }

  get rows(): T["Row"][] {
    const table = this.#table;
    const rows = [...table.rows];
    const filtered = rows.filter((row) => this.#filter.matches(row));

    if (this.#sort) {
      return filtered.sort(this.#sort);
    } else {
      return filtered;
    }
  }
}
