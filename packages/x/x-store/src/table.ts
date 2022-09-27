import { type Description, descriptionFrom, entryPoint } from "@starbeam/debug";
import { reactive } from "@starbeam/js";

import type { Groups } from "./flat.js";
import { FlatRows } from "./flat.js";

export class Table<U extends UserTypes> extends FlatRows<U> {
  static create<S extends SpecifiedTableDefinition>(
    this: void,
    definition: S
  ): Table<{
    Columns: ReturnType<S["model"]>["row"];
    Row: ReturnType<S["model"]>;
  }>;
  static create<C extends object>(
    this: void,
    definition: {
      columns: (keyof C)[];
      name?: string;
    }
  ): Table<C>;
  static create(
    this: void,
    definition: {
      columns: (keyof object)[];
      model?: Model<TableTypes>;
      name?: string;
    }
  ): Table<TableTypes> {
    const description = descriptionFrom({
      type: "formula",
      api: {
        package: "internal",
        name: "Table",
      },
      fromUser: definition.name ?? definition.model?.name ?? "table",
    });

    return new Table<TableTypes>(
      {
        columns: definition.columns,
        model:
          definition.model ?? ((id: string, data: object) => ({ id, ...data })),
      },
      description
    );
  }

  #id = 0;
  readonly #definition: TableDefinition<TableTypesFor<U>>;
  readonly #rows: Map<string, TableTypesFor<U>["Row"]>;
  readonly #description: Description;

  private constructor(
    definition: TableDefinition<TableTypesFor<U>>,
    description: Description
  ) {
    super();
    this.#rows = reactive.Map(description);
    this.#definition = definition;
    this.#description = description;
  }

  get columns(): ColumnName<TableTypesFor<U>["Columns"]>[] {
    return this.#definition.columns;
  }

  get rows(): TableTypesFor<U>["Row"][] {
    return entryPoint(() => [...this.#rows.values()]);
  }

  append(
    row: TableTypesFor<U>["Columns"] & { id?: string }
  ): TableTypesFor<U>["Row"];
  append(...rows: (TableTypesFor<U>["Columns"] & { id?: string })[]): void;
  append(
    ...rows: (TableTypesFor<U>["Columns"] & { id?: string })[]
  ): TableTypesFor<U>["Row"] | void {
    for (const columns of rows) {
      const id = columns.id ?? String(this.#id++);
      const row = this.#definition.model(id, columns);
      this.#rows.set(id, row);

      if (rows.length === 1) {
        return row;
      }
    }
  }

  clear(): void {
    this.#rows.clear();
  }

  delete(id: string): void {
    this.#rows.delete(id);
  }
}

// export type Table<T extends TableTypes | object> = T extends TableTypes
//   ? TableImpl<T>
//   : TableImpl<{
//       Columns: T;
//       Row: { id: string } & T;
//     }>;

// export const Table = {
//   create: TableImpl.create,
// };

type ColumnName<C> = keyof C;

export interface Model<T extends TableTypes> {
  (id: string, columns: T["Columns"]): T["Row"];
}

export type UserTypes = object | TableTypes;

export type TableTypesFor<U extends UserTypes> = U extends TableTypes
  ? U
  : {
      Columns: U;
      Row: { id: string } & U;
    };

export type RowTypeFor<U extends UserTypes> = TableTypesFor<U>["Row"];
export type GroupTypeFor<U extends UserTypes, Description> = Groups<
  TableTypesFor<U>,
  Description
>;

export interface TableTypes {
  Columns: object;
  Row: { id: string };
}

interface SpecifiedTableDefinition {
  readonly columns: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly model: (id: string, data: any) => { id: string; row: any };
  readonly name?: string;
}

export interface TableDefinition<T extends TableTypes> {
  readonly columns: ColumnName<T["Columns"]>[];
  readonly model: Model<T>;
}
