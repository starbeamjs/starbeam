import {
  isPresent,
  mapOrNullifyEmpty,
  objectHasKeys,
} from "@starbeam/core-utils";
import Table from "cli-table3";

import {
  type IntoFragment,
  EMPTY_WIDTH,
  Fragment,
  isIntoFragment,
} from "../log.js";
import { DisplayStruct } from "./inspect.js";
import type { LoggerState } from "./logger.js";

interface Mappers<T> {
  header: (item: T) => IntoFragment;
  cell: (item: T) => IntoFragment;
}

type IntoCell<T> = Cell | T;
type IntoRows<T> = IntoCell<T>[][];

interface CreateRows<T> {
  rows: (rows?: IntoRows<T | IntoFragment>) => TableWithRows<T>;
}

export class LoggedTable<T> implements CreateRows<T> {
  readonly #mappers: Mappers<T>;

  constructor(mappers: Mappers<T>) {
    this.#mappers = mappers;
  }

  columns(columns: IntoColumn[]): TableWithHeaders<T> {
    return new TableWithHeaders(
      this.#mappers,
      Columns.from(columns.map((c) => Column.from(c)))
    );
  }

  headers(headers: (Cell | T)[] | undefined): TableWithHeaders<T> | this {
    if (headers) {
      return new TableWithHeaders(
        this.#mappers,
        Columns.from(headers.map((h) => Cell.from(h, this.#mappers.header)))
      );
    } else {
      return this;
    }
  }

  rows(rows?: IntoRows<T | IntoFragment>): TableWithRows<T> {
    if (!rows) {
      return new TableWithRows({
        mappers: this.#mappers,
        headers: undefined,
        rows: [],
        options: Table3Options.default(),
      });
    }

    const rowList = rows.map((cells) =>
      cells.map((cell) => {
        if (Cell.is(cell)) {
          return cell;
        } else {
          return Cell.create(cell, (value) => {
            if (isIntoFragment(value)) {
              return Fragment.from(value);
            } else {
              return Fragment.from(this.#mappers.cell(value));
            }
          });
        }
      })
    );

    return TableWithRows.create({
      mappers: this.#mappers,
      headers: undefined,
      rows: rowList,
    });
  }
}

export interface ColumnOptions {
  readonly width?: number | "auto";
  readonly justify?: Table.HorizontalAlignment;
}

class Columns {
  static default(): Columns {
    return new Columns([]);
  }

  static from(cells: IntoColumn[]): Columns {
    return new Columns(cells.map(Column.from));
  }

  readonly #columns: Column[];

  constructor(columns: Column[]) {
    this.#columns = columns;
  }

  headers(state: LoggerState): string[] | undefined {
    return mapOrNullifyEmpty(
      this.#columns,
      (column) => column.header(state) ?? ""
    );
  }

  columnWidths(rows: Cell[][], state: LoggerState): number[] | undefined {
    return mapOrNullifyEmpty(this.#columns, (column, index) =>
      column.maxWidth(rows.map((row) => row[index]).filter(isPresent), state)
    );
  }

  get justifications(): Table.HorizontalAlignment[] | undefined {
    return mapOrNullifyEmpty(this.#columns, (column) => column.justification);
  }
}

export type IntoColumn = IntoCell<IntoFragment> | Column;

export function Col(
  from: Cell | IntoFragment,
  options?: ColumnOptions
): Column {
  return Column.from(from, options);
}

class Column {
  static get default(): Column {
    return new Column(undefined, { width: "auto", justify: "left" });
  }

  static is(value: unknown): value is Column {
    return !!(value && typeof value === "object" && value instanceof Column);
  }

  // This allows Column.from to be used as a function passed to .map()
  static from(from: IntoColumn): Column;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  static from(from: IntoColumn, options?: ColumnOptions): Column;
  static from(from: IntoColumn, options?: ColumnOptions): Column {
    if (Column.is(from)) {
      return from;
    } else {
      return new Column(Cell.from(from), {
        ...options,
        width: "auto",
        justify: "left",
      });
    }
  }

  #header: Cell | undefined;
  #options: ColumnOptions;

  constructor(header: Cell | undefined, options: ColumnOptions) {
    this.#header = header;
    this.#options = options;
  }

  header(state: LoggerState): string | undefined {
    return this.#header?.stringify(state);
  }

  maxWidth(rows: Cell[], state: LoggerState): number {
    if (this.#options.width === "auto" || this.#options.width === undefined) {
      return Math.max(
        this.#header?.width(state) ?? EMPTY_WIDTH,
        ...rows.map((row) => row.width(state))
      );
    } else {
      return this.#options.width;
    }
  }

  get justification(): Table.HorizontalAlignment {
    return this.#options.justify ?? "left";
  }
}

export class TableWithHeaders<T> {
  readonly #mappers: Mappers<T>;
  readonly #headers: Columns | undefined;

  constructor(mappers: Mappers<T>, headers: Columns | undefined) {
    this.#mappers = mappers;
    this.#headers = headers;
  }

  rows(rows?: IntoRows<T>): TableWithRows<T> {
    return TableWithRows.create({
      mappers: this.#mappers,
      headers: this.#headers,
      rows:
        rows?.map((cells) =>
          cells.map((cell) => Cell.from(cell, this.#mappers.cell))
        ) ?? [],
    });
  }
}

type CellMapper<T> = (
  value: Exclude<T, Cell>,
  state: LoggerState
) => Fragment | Cell;

export class Cell {
  static is(value: unknown): value is Cell {
    return value instanceof Cell;
  }

  static from(value: IntoCell<IntoFragment>): Cell;
  static from<T>(value: IntoCell<T>, mapper: (value: T) => IntoFragment): Cell;
  static from(value: unknown, mapper?: (value: unknown) => IntoFragment): Cell {
    if (Cell.is(value)) {
      return value;
    } else if (mapper) {
      return Cell.create(value, mapper as CellMapper<unknown>);
    } else {
      return Cell.create(value as IntoFragment, Fragment.from);
    }
  }

  static create<T>(value: T, mapper: CellMapper<T>): Cell;
  static create<T>(value: T | IntoFragment, mapper?: CellMapper<T>): Cell {
    return new Cell(
      value,
      mapper as CellMapper<unknown>,
      Table3Options.default()
    );
  }

  static spanned(value: IntoFragment, span: number): Cell {
    return Cell.create(value, Fragment.from).options((o) =>
      o.add({ colSpan: span })
    );
  }

  readonly #value: unknown;
  readonly #mapper: CellMapper<unknown>;
  readonly #options: Table3Options<Table.CellOptions>;

  private constructor(
    value: unknown,
    mapper: CellMapper<unknown>,
    options: Table3Options<Table.CellOptions>
  ) {
    this.#value = value;
    this.#mapper = mapper;
    this.#options = options;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Cell", {
      value: this.#value,
      options: this.#options,
    });
  }

  options(
    updater: (
      options: Table3Options<Table.CellOptions>
    ) => Table3Options<Table.CellOptions>
  ): Cell {
    return new Cell(this.#value, this.#mapper, updater(this.#options));
  }

  toTable3(state: LoggerState): Table.Cell {
    const content = this.stringify(state);

    if (objectHasKeys(this.#options)) {
      return { content, ...this.#options.toTable3() };
    } else {
      return content;
    }
  }

  stringify(state: LoggerState): string {
    return this.#fragment(state).stringify(state);
  }

  width(options: LoggerState): number {
    return this.#fragment(options).width(options);
  }

  #fragment(state: LoggerState): Fragment {
    const value = this.#value;
    const mapped = this.#mapper(value, state);

    if (Cell.is(mapped)) {
      return mapped.#fragment(state);
    } else {
      return mapped;
    }
  }
}

type AnyTable3Options = Table.CellOptions | Table.TableConstructorOptions;

class Table3Options<O extends AnyTable3Options> {
  static default<O extends AnyTable3Options>(): Table3Options<O> {
    return new Table3Options<O>({
      chars: TABLE_CHARS,
    } as O);
  }

  #options: Omit<O, "content">;

  constructor(options: Omit<O, "content">) {
    this.#options = options;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct("Table3Options", this.#options);
  }

  replace(options: Omit<O, "content">): Table3Options<O> {
    return new Table3Options(options);
  }

  add(options: Omit<O, "content">): Table3Options<O> {
    return new Table3Options({
      ...this.#options,
      ...options,
    });
  }

  replaceStyle(style: O["style"]): Table3Options<O> {
    return this.add({ style } as Extract<O, "style">);
  }

  style(style: O["style"]): Table3Options<O> {
    return new Table3Options({
      ...this.#options,
      style: {
        ...this.#options.style,
        ...style,
      },
    });
  }

  padding(
    amount: number,
    side?: "left" | "right" | undefined
  ): Table3Options<O> {
    const leftPadding = side !== "right" ? amount : undefined;
    const rightPadding = side !== "left" ? amount : undefined;

    const style = {} as Exclude<O["style"], undefined>;

    if (leftPadding) {
      style["padding-left"] = leftPadding;
    }

    if (rightPadding) {
      style["padding-right"] = rightPadding;
    }

    return this.style(style);
  }

  justify(
    this: Table3Options<Table.CellOptions>,
    alignment: Table.HorizontalAlignment
  ): Table3Options<O> {
    return new Table3Options({
      ...this.#options,
      hAlign: alignment,
    } as O & Table.CellOptions);
  }

  align(
    this: Table3Options<Table.CellOptions>,
    alignment: Table.VerticalAlignment
  ): Table3Options<O> {
    return new Table3Options({
      ...this.#options,
      vAlign: alignment,
    } as O & Table.CellOptions);
  }

  toTable3(): Omit<O, "content"> {
    return this.#options;
  }
}

const TABLE_CHARS = {
  "top-left": "╭",
  "top-right": "╮",
  "bottom-left": "╰",
  "bottom-right": "╯",
  "top-mid": "┬",
  "bottom-mid": "┴",
  "left-mid": "├",
  "right-mid": "┤",
  "mid-mid": "┼",
  bottom: "─",
  top: "─",
  left: "│",
  right: "│",
  mid: "─",
  middle: "│",
} as const;

export class TableWithRows<T> {
  static headers<T>(
    headers: Columns | undefined,
    mappers: Mappers<T>
  ): TableWithRows<T> {
    return new TableWithRows({
      headers,
      rows: [],
      mappers,
      options: Table3Options.default(),
    });
  }

  static create<T>({
    headers,
    rows,
    mappers,
  }: {
    headers: Columns | undefined;
    rows: Cell[][];
    mappers: Mappers<T>;
  }): TableWithRows<T> {
    return new TableWithRows({
      mappers,
      headers,
      rows: rows.map((cells) =>
        cells.map((cell) => Cell.from(cell, mappers.cell))
      ),
      options: Table3Options.default(),
    });
  }

  readonly #mappers: Mappers<T>;
  readonly #columns: Columns | undefined;
  readonly #rows: Cell[][];
  readonly #options: Table3Options<Table.TableConstructorOptions>;

  constructor({
    mappers,
    headers,
    rows,
    options,
  }: {
    mappers: Mappers<T>;
    headers: Columns | undefined;
    rows: Cell[][];
    options: Table3Options<Table.TableConstructorOptions>;
  }) {
    this.#mappers = mappers;
    this.#columns = headers;
    this.#rows = rows;
    this.#options = options;
  }

  add(items: (T | Cell)[]): TableWithRows<T> {
    return new TableWithRows({
      mappers: this.#mappers,
      headers: this.#columns,
      rows: [
        ...this.#rows,
        items.map((cell) => Cell.from(cell, this.#mappers.cell)),
      ],
      options: Table3Options.default(),
    });
  }

  options(
    updater: (
      options: Table3Options<Table.TableConstructorOptions>
    ) => Table3Options<Table.TableConstructorOptions>
  ): TableWithRows<T> {
    return new TableWithRows({
      mappers: this.#mappers,
      headers: this.#columns,
      rows: this.#rows,
      options: updater(this.#options),
    });
  }

  stringify(state: LoggerState): string {
    return String(this.toTable(state));
  }

  toTable(state: LoggerState): Table.Table {
    const columns = this.#columns ?? Columns.default();
    const rows = this.#rows;

    const table3Options = {
      ...this.#options.toTable3(),
      chars: TABLE_CHARS,
    };

    const headers = columns.headers(state);

    if (headers) {
      table3Options.head = headers;
    }

    const widths = columns.columnWidths(rows, state);

    if (widths) {
      // Each cell is padded by 1 space on each side
      const CELL_PADDING = 2;
      table3Options.colWidths = widths.map((w) => w + CELL_PADDING);
    }

    const aligns = columns.justifications;

    if (aligns) {
      table3Options.colAligns = aligns;
    }

    const table = new Table(table3Options);

    table.push(
      ...rows.map((cells) => cells.map((cell) => cell.toTable3(state)))
    );

    return table;
  }
}
