import Table from "cli-table3";
import { Fragment, LogResult, type IntoFragment } from "../log.js";
import { Result } from "../type-magic.js";
import type { LoggerState } from "./logger.js";

interface Mappers<T> {
  header: (item: T) => LogResult<Cell | Fragment>;
  cell: (item: T) => LogResult<Cell | Fragment>;
}

export class LoggedTable<T> {
  readonly #mappers: Mappers<T>;

  constructor(mappers: Mappers<T>) {
    this.#mappers = mappers;
  }

  headers(headers: (Cell | T)[]): TableWithHeaders<T> {
    return new TableWithHeaders(
      this.#mappers,
      mapHeader(headers, this.#mappers)
    );
  }

  rows(rows?: (Cell | T)[][]): TableWithRows<T> {
    return TableWithRows.create({
      mappers: this.#mappers,
      headers: undefined,
      rows,
    });
  }
}

export interface ColumnOptions {
  readonly width: number | "auto";
  readonly justify: Table.HorizontalAlignment;
}

class Columns {
  static default(): Columns {
    return new Columns([]);
  }

  static from(cells: (Cell | Column)[]): Columns;
  static from(cells: LogResult<(Cell | Column)[]>): LogResult<Columns>;
  static from(
    cells: LogResult<(Cell | Column)[]> | (Cell | Column)[]
  ): LogResult<Columns> | Columns;
  static from(
    cells: LogResult<(Cell | Column)[]> | (Cell | Column)[]
  ): LogResult<Columns> | Columns {
    if (Array.isArray(cells)) {
      return new Columns(cells.map(Column.from));
    } else {
      return cells.map((cells) => Columns.from(cells));
    }
  }

  readonly #columns: Column[];

  constructor(columns: Column[]) {
    this.#columns = columns;
  }

  headers(state: LoggerState): string[] | undefined {
    if (this.#columns.length === 0) {
      return undefined;
    } else {
      return this.#columns.map((column) => column.header(state) ?? "");
    }
  }

  columnWidths(rows: Cell[][], state: LoggerState): number[] | undefined {
    if (this.#columns.length === 0) {
      return undefined;
    } else {
      return rows.map((row, i) => {
        const column =
          (this.#columns[i] as Column | undefined) ?? Column.default;
        return column.maxWidth(row, state);
      });
    }
  }

  get justifications(): Table.HorizontalAlignment[] | undefined {
    if (this.#columns.length === 0) {
      return undefined;
    } else {
      return this.#columns.map((column) => column.justification);
    }
  }
}

export type IntoColumn = Cell | Fragment | Column;

export function Col(from: Cell | Fragment, options?: ColumnOptions): Column {
  return Column.from(from, options);
}

class Column {
  static get default(): Column {
    return new Column(undefined, { width: "auto", justify: "left" });
  }

  static from(from: Cell | Fragment | Column): Column;
  static from(from: Cell | Fragment | Column, options?: ColumnOptions): Column;
  static from(from: Cell | Fragment | Column, options?: ColumnOptions): Column {
    if (from instanceof Column) {
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
    if (this.#options.width === "auto") {
      return Math.max(
        this.#header?.width(state) ?? 0,
        ...rows.map((row) => row.width(state))
      );
    } else {
      return this.#options.width;
    }
  }

  get justification(): Table.HorizontalAlignment {
    return this.#options.justify;
  }
}

function mapRows<T>(
  rows: (T | Cell)[][],
  mappers: Mappers<T>
): LogResult<Cell[][]> {
  return Result.map(rows, (row) => mapRow(row, mappers));
}

function mapHeader<T>(
  header: (T | Cell)[],
  mappers: Mappers<T>
): LogResult<Columns> {
  return Columns.from(
    Result.map(header, (cell) => mapItem(cell, mappers.header))
  );
}

function mapRow<T>(row: (T | Cell)[], mappers: Mappers<T>): LogResult<Cell[]> {
  return Result.map(row, (cell) => mapItem(cell, mappers.cell));
}

function mapItem<T>(
  value: T | Cell,
  mapper: (item: T) => LogResult<Cell | Fragment>
): LogResult<Cell> {
  if (Cell.is(value)) {
    return Result.ok(value);
  } else {
    return mapper(value).map(Cell.from);
  }
}

export class TableWithHeaders<T> {
  readonly #mappers: Mappers<T>;
  readonly #headers: LogResult<Columns>;

  constructor(mappers: Mappers<T>, headers: LogResult<Columns>) {
    this.#mappers = mappers;
    this.#headers = headers;
  }

  rows(rows?: (Cell | T)[][]): TableWithRows<T> {
    return TableWithRows.create({
      mappers: this.#mappers,
      headers: this.#headers,
      rows,
    });
  }
}

type CellMapper<T> = (value: T, state: LoggerState) => Fragment;

export class Cell {
  static is(value: unknown): value is Cell {
    return value instanceof Cell;
  }

  static from(value: Cell | Fragment): Cell;
  static from<T>(value: T | Cell, mapper: (value: T) => IntoFragment): Cell;
  static from(
    value: unknown | Cell | Fragment,
    mapper?: (value: unknown) => IntoFragment
  ): Cell {
    if (Cell.is(value)) {
      return value;
    } else if (mapper) {
      return Cell.create(mapper(value), Fragment.from);
    } else {
      return Cell.create(value as Fragment, (value) => value);
    }
  }

  static create(value: IntoFragment): Cell;
  static create<T>(value: T, mapper: CellMapper<T>): Cell;
  static create<T>(value: T | IntoFragment, mapper?: CellMapper<T>): Cell {
    return new Cell(
      value,
      (mapper ?? Fragment.from) as CellMapper<unknown>,
      Table3Options.default()
    );
  }

  static spanned(value: IntoFragment, span: number): Cell {
    return Cell.create(value).options((o) => o.add({ colSpan: span }));
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

  options(
    updater: (
      options: Table3Options<Table.CellOptions>
    ) => Table3Options<Table.CellOptions>
  ): Cell {
    return new Cell(this.#value, this.#mapper, updater(this.#options));
  }

  toTable3(state: LoggerState): Table.Cell {
    const content = this.stringify(state);

    if (this.#options) {
      return { content, ...this.#options.toTable3() };
    } else {
      return content;
    }
  }

  stringify(state: LoggerState): string {
    return this.#mapper(this.#value, state).stringify(state);
  }

  width(options: LoggerState): number {
    return this.#mapper(this.#value, options).width(options);
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
        ...this.#options?.style,
        ...style,
      },
    });
  }

  padding(amount: number, side?: "left" | "right"): Table3Options<O> {
    const leftPadding = side !== "right" ? amount : undefined;
    const rightPadding = side !== "left" ? amount : undefined;

    return this.style({
      "padding-left": leftPadding,
      "padding-right": rightPadding,
    });
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
  static create<T>({
    headers,
    rows,
    mappers,
  }: {
    headers?: LogResult<Columns>;
    rows?: (Cell | T)[][];
    mappers: Mappers<T>;
  }): TableWithRows<T> {
    if (rows === undefined) {
      return new TableWithRows({
        mappers,
        headers,
        rows: undefined,
        options: Table3Options.default(),
      });
    } else {
      return new TableWithRows({
        mappers,
        headers: undefined,
        rows: mapRows(rows, mappers),
        options: Table3Options.default(),
      });
    }
  }

  readonly #mappers: Mappers<T>;
  readonly #columns: LogResult<Columns> | undefined;
  readonly #rows: LogResult<Cell[][]> | undefined;
  readonly #options: Table3Options<Table.TableConstructorOptions>;

  constructor({
    mappers,
    headers,
    rows,
    options,
  }: {
    mappers: Mappers<T>;
    headers: LogResult<Columns> | undefined;
    rows: LogResult<Cell[][]> | undefined;
    options: Table3Options<Table.TableConstructorOptions>;
  }) {
    this.#mappers = mappers;
    this.#columns = headers;
    this.#rows = rows;
    this.#options = options;
  }

  add(items: (T | Cell)[]): TableWithRows<T> {
    const list = mapRow(items, this.#mappers);

    return new TableWithRows({
      mappers: this.#mappers,
      headers: this.#columns,
      rows: Result.record({ prev: this.#rows, next: list }).map(
        ({ prev, next }) => [...prev, next]
      ),
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

  stringify(state: LoggerState): LogResult<string> {
    return this.toTable(state).map((table) => table.toString());
  }

  toTable(state: LoggerState): LogResult<Table.Table> {
    return Result.record({
      columns: this.#columns ?? LogResult.ok(Columns.default()),
      rows: this.#rows ?? LogResult.ok([]),
    }).map(({ columns, rows }) => {
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
        table3Options.colWidths = widths;
      }

      const aligns = columns.justifications;

      if (aligns) {
        table3Options.colAligns = aligns;
      }

      const table = new Table(table3Options);

      if (rows !== undefined) {
        table.push(
          ...rows.map((cells) => cells.map((cell) => cell.toTable3(state)))
        );
      }

      return table;
    });
  }
}
