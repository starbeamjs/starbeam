import { FormulaState } from "@starbeam/reactive";
import { IndexMap } from "@starbeam/utils";
import type { Row } from "./row.js";
import type { TableType } from "./table.js";

class IndexEntry<T> {
  static create<T>(map: IndexMap<Row, T>, row: Row, indexer: (row: Row) => T) {
    return new IndexEntry(
      map,
      row,
      FormulaState.evaluate(() => indexer(row), "index entry").state
    );
  }

  readonly #map: IndexMap<Row, T>;
  readonly #row: Row;
  readonly #formula: FormulaState<T>;

  private constructor(
    map: IndexMap<Row, T>,
    row: Row,
    formula: FormulaState<T>
  ) {
    this.#map = map;
    this.#row = row;
    this.#formula = formula;
  }

  poll() {
    const validation = this.#formula.validate();

    if (validation.state === "valid") {
      return;
    }

    const newValue = validation.compute();

    if (newValue.state === "unchanged") {
      return;
    }

    this.#map.delete(this.#row, validation.oldValue);
    this.#map.add(this.#row, newValue.value);
  }
}

export class Index<Table extends TableType, Value> {
  static create<Table extends TableType, T>(
    indexer: (row: Row<Table>) => T
  ): Index<Table, T> {
    return new Index(indexer, IndexMap.create(), new Map());
  }

  readonly #indexer: (row: Row<Table>) => Value;
  readonly #map: IndexMap<Row<Table>, Value>;
  readonly #entries: Map<Row<Table>, IndexEntry<Value>>;

  constructor(
    indexer: (row: Row<Table>) => Value,
    map: IndexMap<Row<Table>, Value>,
    entries: Map<Row<Table>, IndexEntry<Value>>
  ) {
    this.#indexer = indexer;
    this.#map = map;
    this.#entries = entries;
  }

  add(row: Row<Table>): void {
    const index = this.#indexer(row);
    this.#entries.set(
      row,
      IndexEntry.create(this.#map, row, this.#indexer as (row: Row) => Value)
    );
    this.#map.add(row, index);
  }

  has(row: Row<Table>, value: Value): boolean {
    this.#validate();
    return this.#map.has(row, value);
  }

  getBy(value: Value): Set<Row<Table>> {
    this.#validate();
    return this.#map.findByValue(value) ?? new Set();
  }

  /**
   * TODO: Wrap this whole thing in a formula so we can avoid iterating over the
   * entries themselves when nothing has changed.
   */
  #validate(): void {
    for (const entry of this.#entries.values()) {
      entry.poll();
    }
  }
}

export type IndexRecord<Table extends TableType> = {
  [P in keyof any]: Index<Table, unknown>;
};

export class Indexes<Table extends TableType> {
  static create<Table extends TableType>(): Indexes<Table> {
    return new Indexes({} as IndexRecord<TableType>);
  }

  readonly #indexes: IndexRecord<Table>;

  constructor(indexes: IndexRecord<Table>) {
    this.#indexes = indexes;
  }

  add(name: string, indexer: (row: Row<Table>) => any): void {
    const index = Index.create(indexer);
    this.#indexes[name] = index;
  }

  get<T>(name: string): Index<Table, T> {
    return this.#indexes[name] as Index<Table, T>;
  }
}
