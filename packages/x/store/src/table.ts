import { reactive } from "@starbeam/collections";
import type { Description } from "@starbeam/interfaces";
import { RUNTIME } from "@starbeam/reactive";

import type { Groups } from "./flat.js";
import { FlatRows } from "./flat.js";

const INITIAL_ID = 0;
const SINGLE_ELEMENT = 1;

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
    const description = RUNTIME.Desc?.(
      "collection",
      definition.name ?? definition.model?.name,
      "Table.create"
    );

    return new Table<TableTypes>(
      {
        columns: definition.columns,
        model:
          definition.model ?? ((id: string, data: object) => ({ id, ...data })),
      },
      description
    );
  }

  #id = INITIAL_ID;
  readonly #definition: TableDefinition<TableTypesFor<U>>;
  readonly #rows: Map<string, TableTypesFor<U>["Row"]>;
  readonly #description: Description | undefined;

  private constructor(
    definition: TableDefinition<TableTypesFor<U>>,
    description: Description | undefined
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
    return [...this.#rows.values()];
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

      if (rows.length === SINGLE_ELEMENT) {
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

type ColumnName<C> = keyof C;

export type Model<T extends TableTypes> = (
  id: string,
  columns: T["Columns"]
) => T["Row"];

export type UserTypes = object | TableTypes;

export type TableTypesFor<U extends UserTypes> = U extends TableTypes
  ? U
  : {
      Columns: U;
      Row: { id: string } & U;
    };

export type RowTypeFor<U extends UserTypes> = TableTypesFor<U>["Row"];
export type GroupTypeFor<U extends UserTypes, GroupDescription> = Groups<
  TableTypesFor<U>,
  GroupDescription
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
