import type { AnyRecord, InferReturn } from "@starbeam/fundamental";
import type { Table, TableType } from "./table.js";

type Concat<Tables extends AnyRecord, Type extends TableType> = Tables & {
  [K in Type["name"]]: Type;
};

type TablesRecord<Tables extends AnyRecord> = {
  [P in keyof Tables]: Table<Tables[P]>;
};

export class Database<Tables extends AnyRecord> {
  static create(): Database<{}> {
    return new Database(new Map());
  }

  readonly #tables: Map<string, Table>;

  private constructor(tables: Map<string, Table>) {
    this.#tables = tables;
  }

  add<T extends TableType>(table: Table<T>): Database<Concat<Tables, T>> {
    this.#tables.set(table.name, table);
    return this as InferReturn;
  }

  query<U>(query: (tables: TablesRecord<Tables>) => U): U {
    return query(
      Object.fromEntries(this.#tables.entries()) as TablesRecord<Tables>
    );
  }
}
