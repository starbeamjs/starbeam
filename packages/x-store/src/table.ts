import reactive from "@starbeam/js";

export class TableImpl<T extends TableTypes> {
  static define<S extends SpecifiedTableDefinition>(
    this: void,
    definition: S
  ): TableImpl<{
    Columns: ReturnType<S["model"]>["row"];
    Row: ReturnType<S["model"]>;
  }>;
  static define<C extends object>(
    this: void,
    definition: {
      columns: (keyof C)[];
    }
  ): TableImpl<{
    Columns: C;
    Row: { id: string } & C;
  }>;
  static define(
    this: void,
    definition: {
      columns: (keyof object)[];
      model?: Model<TableTypes>;
    }
  ): TableImpl<TableTypes> {
    return new TableImpl<TableTypes>({
      columns: definition.columns,
      model:
        definition.model ?? ((id: string, data: object) => ({ id, ...data })),
    });
  }

  #id = 0;
  readonly #definition: TableDefinition<T>;
  readonly #rows = reactive.Map<string, T["Row"]>("table");

  private constructor(definition: TableDefinition<T>) {
    this.#definition = definition;
  }

  get columns(): ColumnName<T["Columns"]>[] {
    return this.#definition.columns;
  }

  get rows(): T["Row"][] {
    return [...this.#rows.values()];
  }

  append(columns: T["Columns"] & { id?: string }): T["Row"] {
    const id = columns.id ?? String(this.#id++);
    const row = this.#definition.model(id, columns);
    this.#rows.set(id, row);
    return row;
  }

  delete(id: string) {
    this.#rows.delete(id);
  }
}

export type Table<T extends TableTypes | object> = T extends TableTypes
  ? TableImpl<T>
  : TableImpl<{
      Columns: T;
      Row: { id: string } & T;
    }>;

export const Table = {
  define: TableImpl.define,
};

type ColumnName<C> = keyof C;

export interface Model<T extends TableTypes> {
  (id: string, columns: T["Columns"]): T["Row"];
}

export interface TableTypes {
  Columns: object;
  Row: unknown;
}

interface SpecifiedTableDefinition {
  readonly columns: string[];
  readonly model: (id: string, data: any) => { row: any };
}

export interface TableDefinition<T extends TableTypes> {
  readonly columns: ColumnName<T["Columns"]>[];
  readonly model: Model<T>;
}
