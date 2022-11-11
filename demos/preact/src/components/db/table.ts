import { object } from "@starbeam/js";

export class Table<T> {
  #rows: Record<string, T> = object({}, "rows");
  #id = 0;

  constructor(readonly columns: string[]) {}

  get rows(): [string, T][] {
    return Object.entries(this.#rows);
  }

  append(row: T): void {
    this.#rows[`${this.#id++}`] = row;
  }
}
