import { reactive } from "@starbeam/core";
import type { AnyRecord } from "@starbeam/fundamental";
import { Marker } from "@starbeam/reactive";
import type { InferReturn } from "@starbeam/utils";
import { as, isPresent, verified } from "@starbeam/verify";
import { Index, Indexes } from "./db-index.js";
import { Reference } from "./reference.js";
import { DraftForNew, Row } from "./row.js";

export type IndexesType<T extends TableType> = {
  [P in keyof any]: Index<T, unknown>;
};

export interface TableType {
  readonly name: string;
  readonly columns: AnyRecord;
  readonly indexes: unknown;
}

export interface RowType<N extends string, C extends AnyRecord>
  extends TableType {
  readonly name: N;
  readonly columns: C;
  readonly indexes: any;
}

export class Table<T extends TableType = TableType>
  implements Iterable<Row<T>>
{
  static define<C extends AnyRecord>(): {
    named<N extends string>(
      name: N
    ): Table<{ name: N; columns: C; indexes: {} }>;
  } {
    return {
      named<N extends string>(name: N) {
        type Type = { name: N; columns: C; indexes: {} };

        return new Table(
          name,
          Marker(`${name} table`),
          reactive(Map) as Map<string, Row<Type>>,
          Indexes.create()
        );
      },
    };
  }

  [Symbol.toStringTag]: string = "Table";

  readonly #name: T["name"];
  readonly #marker: Marker;
  readonly #rows: Map<string, Row<T>>;
  readonly #indexes: Indexes<T>;

  private constructor(
    name: T["name"],
    marker: Marker,
    rows: Map<string, Row<T>>,
    indexes: Indexes<T>
  ) {
    this.#name = name;
    this.#marker = marker;
    this.#rows = rows as Map<string, Row<T>>;
    this.#indexes = indexes;
  }

  get name(): T["name"] {
    return this.#name;
  }

  readonly define = {
    index: <N extends string, U>(
      name: N,
      indexer: (row: Row<T>) => U
    ): Table<{
      readonly name: T["name"];
      readonly columns: T["columns"];
      readonly indexes: T["indexes"] & { [P in N]: U };
    }> => {
      this.#indexes.add(name, indexer);
      return this as InferReturn;
    },
  };

  reference<Id extends string>(id: Id): Reference<T, Id> {
    return Reference.create(this, id);
  }

  get(id: string): Row<T> | null {
    return this.#rows.get(id) ?? null;
  }

  create<Id extends string>(id: Id, columns: T["columns"]): Row<T> {
    return this.insert(Row.instantiate(this, id, columns));
  }

  *queryBy<K extends keyof T["indexes"] & string>(query: {
    [P in keyof T["indexes"]]?: T["indexes"][P];
  }): Iterable<Row<T>> {
    const indexes = Object.entries(query);
    const [firstIndexName, firstIndexValue] = verified(
      indexes.shift(),
      isPresent,
      as("a query key").when("calling queryBy")
    );
    const firstIndex = this.#getIndex(firstIndexName);

    const rows = firstIndex.getBy(firstIndexValue);

    for (const row of rows) {
      verifyRow: {
        for (const [indexName, indexValue] of indexes) {
          if (!this.#getIndex(indexName).has(row, indexValue)) {
            break verifyRow;
          }
        }

        yield row;
      }
    }
  }

  #getIndex(key: string): Index<T, unknown> {
    return verified(
      this.#indexes.get(key),
      isPresent,
      as(`an index named ${key}`)
    );
  }

  *query(query: (row: Row<T>) => boolean): Iterable<Row<T>> {
    for (const row of this) {
      if (query(row)) {
        yield row;
      }
    }
  }

  new<Id extends string>(
    build: (draft: DraftForNew<T, null>) => Row<T, Id>
  ): Row<T, Id> {
    const draft = DraftForNew.create(this, null);
    const row = build(draft);
    this.insert(row);
    return row;
  }

  draft(): DraftForNew<T, null>;
  draft<Id extends string>(id: Id): DraftForNew<T, Id>;
  draft(id: string | null = null): DraftForNew<T, string | null> {
    return DraftForNew.create(this, id);
  }

  /**
   * Insert a new row into this table.
   */
  insert<R extends Row<T>>(row: R): R {
    this.#rows.set(row.id, row);
    // update the table's marker, so that the iterator will yield the new row
    // the next time it is iterated
    this.#marker.update();

    return row;
  }

  /**
   * Delete a row from this table based on its ID. You can also pass a row
   * instance, in which case the ID of the row will be used.
   */
  delete(id: string): void;
  delete(row: Row<T>): void;
  delete(row: string | Row<T>): void {
    if (typeof row === "string") {
      this.#rows.delete(row);
    } else {
      this.#rows.delete(row.id);
    }
  }

  has(id: string): boolean {
    return this.#rows.has(id);
  }

  /*
   * Iterate over all rows in this table. The iteration process consumes the
   * marker, which means that the next time a row is inserted, the iteration
   * computation will be invalidated.
   */
  *[Symbol.iterator]() {
    this.#marker.consume();

    for (const row of this.#rows.values()) {
      yield row;
    }
  }
}
