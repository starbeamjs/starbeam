import { DisplayNewtype } from "@starbeam/core-utils";
import type { ChangeResult } from "@starbeam-workspace/shared";
import type * as codespan from "codespan-wasm";
import * as jsonc from "jsonc-parser";
import { LinesAndColumns } from "lines-and-columns";

import { display, type DisplayOptions } from "../diagnostics.js";
import type { JsonModification } from "../edits/edits.js";
import { firstCursorAfter, lastCursorBefore } from "./locations.js";
import {
  type JsoncValueNode,
  type JsonNode,
  type JsonValueNode,
  nextOffset,
  prevOffset,
} from "./node.js";
import { getArrayAt, getObjectAt, getValueAt } from "./nodes/abstract.js";
import type { JsonArrayNode } from "./nodes/array.js";
import type { BaseNode } from "./nodes/base.js";
import { intoValueNode } from "./nodes/convert.js";
import type { JsonEntryNode, JsonObjectNode } from "./nodes/object.js";

export interface AsJsoncRange {
  readonly length: number;
  asJsoncRange: () => jsonc.Range;
}

const EMPTY_SIZE = 0;
const MISSING_INDEX = -1;

export class SourceCursor implements AsJsoncRange {
  static of(source: SourceRoot, offset: number): SourceCursor {
    return new SourceCursor(source, offset);
  }

  readonly #source: SourceRoot;
  readonly #offset: number;

  private constructor(source: SourceRoot, offset: number) {
    this.#source = source;
    this.#offset = offset;
  }

  get length(): number {
    return EMPTY_SIZE;
  }

  get at(): number {
    return this.#offset;
  }

  get lineno(): number | undefined {
    return this.#source.lineno(this);
  }

  /**
   * Returns true if this cursor is on the same line as `other`.
   */
  onSameLine(other: SourceCursor): boolean {
    const thisLine = this.#source.lineno(this);
    const otherLine = other.#source.lineno(other);

    return (
      thisLine !== undefined &&
      otherLine !== undefined &&
      thisLine === otherLine
    );
  }

  until(cursor: SourceCursor): SourceRange {
    return SourceRange.of(this.#source, [this.#offset, cursor.#offset]);
  }

  asRange(): SourceRange {
    return SourceRange.of(this.#source, [this.#offset, this.#offset]);
  }

  display(options?: DisplayOptions): string {
    return display(this.asRange(), options);
  }

  asJsoncRange(): jsonc.Range {
    return {
      offset: this.#offset,
      length: 0,
    };
  }
}

export type IntoSourceRange =
  | SourceRange
  | SourceCursor
  | { range: SourceRange; marker: SourceRange };

export class SourceRange implements AsJsoncRange {
  static of(
    source: SourceRoot,
    [from, to]: [from: number, to: number],
  ): SourceRange {
    return new SourceRange(source, from, to);
  }

  static marker(from: IntoSourceRange): SourceRange {
    if (from instanceof SourceRange) {
      return from;
    } else if (from instanceof SourceCursor) {
      return from.asRange();
    } else {
      return from.marker;
    }
  }

  static from(from: IntoSourceRange): SourceRange {
    if (from instanceof SourceRange) {
      return from;
    } else if (from instanceof SourceCursor) {
      return from.asRange();
    } else {
      return from.range;
    }
  }

  readonly #source: SourceRoot;
  readonly #from: number;
  readonly #to: number;

  private constructor(source: SourceRoot, from: number, to: number) {
    this.#source = source;
    this.#from = from;
    this.#to = to;
  }

  [Symbol.toStringTag] = "SourceRange";

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayNewtype("SourceRange", `${this.format()}`);
  }

  toString(): string {
    return `${this.#from}..${this.#to}`;
  }

  display(options?: DisplayOptions): string {
    return display(this, options);
  }

  get root(): SourceRoot {
    return this.#source;
  }

  slice(): string {
    return this.#source.slice(this);
  }

  /**
   * Returns true if the entirety of this range is on the same line as the
   * entirety of `other`.
   */
  onSameLine(other: SourceRange): boolean {
    return this.startCursor.onSameLine(other.endCursor);
  }

  isSingleLine(): boolean {
    return this.startCursor.onSameLine(this.endCursor);
  }

  /**
   * Returns the line number of this range if the entire range is contained on
   * the same line.
   */
  get lineno(): number | undefined {
    const startLine = this.#source.lineno(this.startCursor);
    const endLine = this.#source.lineno(this.endCursor);

    return startLine !== undefined &&
      endLine !== undefined &&
      startLine === endLine
      ? startLine
      : undefined;
  }

  get startCursor(): SourceCursor {
    return SourceCursor.of(this.#source, this.#from);
  }

  get endCursor(): SourceCursor {
    return SourceCursor.of(this.#source, this.#to);
  }

  get start(): number {
    return this.#from;
  }

  get end(): number {
    return this.#to;
  }

  get cursorAfter(): SourceCursor {
    return SourceCursor.of(this.#source, this.#to);
  }

  get cursorBefore(): SourceCursor {
    return SourceCursor.of(this.#source, this.#from);
  }

  get length(): number {
    return this.#to - this.#from;
  }

  /**
   * If the range represents a delimited area (surrounded by paired brackets), this
   * returns the range without the brackets.
   */
  get inner(): SourceRange {
    return new SourceRange(
      this.#source,
      nextOffset(this.#from),
      prevOffset(this.#to),
    );
  }

  /**
   * Returns a range that starts at the same position as this range and ends at the
   * same position as `next`.
   *
   * The next range must start after this range starts.
   */
  startUntil(next: SourceRange): SourceRange {
    if (next.#from < this.#from) {
      throw Error(
        `This range (${String(
          this,
        )}) must start before the range you are trying to startUntil (${String(
          next,
        )}). Did you mean to call startUntil on ${String(next)} instead?`,
      );
    }

    return new SourceRange(this.#source, this.#from, next.#from);
  }

  /**
   * Extends the current range so that it ends at the same position as `next`.
   *
   * The next range must start after this range ends.
   */
  extend(next: SourceRange): SourceRange {
    if (next.#from > this.#to) {
      throw Error(
        `The range you are extending (${String(
          next,
        )}) must start after this range (${String(
          this,
        )}) ends. Did you mean 'startUntil' instead?`,
      );
    }

    return new SourceRange(this.#source, this.#from, next.#to);
  }

  format(): string {
    return `at ${this.#from}..${this.#to}`;
  }

  asJsoncRange(): jsonc.Range {
    return {
      offset: this.#from,
      length: this.#to - this.#from,
    };
  }
}

export class SourceRoot implements codespan.File {
  static parse(name: string, source: string): SourceRoot {
    return new SourceRoot(name, source);
  }

  readonly name: string;
  readonly source: string;
  readonly node: JsonValueNode;

  #linesCache: LinesAndColumns | undefined;

  constructor(name: string, source: string) {
    this.name = name;
    this.source = source;
    this.node = intoValueNode(this, parse(this.source) as JsoncValueNode, []);
  }

  get #lines(): LinesAndColumns {
    if (this.#linesCache === undefined) {
      this.#linesCache = new LinesAndColumns(this.source);
    }

    return this.#linesCache;
  }

  modifiable(): ModifiableSourceRoot {
    return new ModifiableSourceRoot(this);
  }

  lineAtLineno(lineno: number): string | undefined {
    const offset = this.#lines.indexForLocation({ line: lineno, column: 0 });
    if (offset === null) return undefined;

    const nextLine = this.source.indexOf("\n", offset);

    return nextLine === MISSING_INDEX
      ? this.source.slice(offset)
      : this.source.slice(offset, nextLine);
  }

  lineno(cursor: SourceCursor): number | undefined {
    return this.#lines.locationForIndex(cursor.at)?.line;
  }

  slice({ start, end }: SourceRange): string {
    return this.source.slice(start, end);
  }

  /**
   * Returns the range that represents the cursor positions inside the range.
   * This excludes whitespace around textual characters in the range.
   */
  rangeAtCursors(range: SourceRange): SourceRange {
    const { source } = this;

    const start = firstCursorAfter(source, range.start).cursor;
    const end = lastCursorBefore(source, range.end);

    return SourceRange.of(this, [start, end]);
  }

  firstCursorAfter(offset: number): { cursor: number; newline: boolean } {
    return firstCursorAfter(this.source, offset);
  }

  lastCursorBefore(offset: number): number {
    return lastCursorBefore(this.source, offset);
  }

  getArrayAt(path: jsonc.JSONPath): JsonArrayNode | undefined {
    return getArrayAt(this.node, path);
  }

  getObjectAt(path: jsonc.JSONPath): JsonObjectNode | undefined {
    return getObjectAt(this.node, path);
  }

  getValueAt(path: jsonc.JSONPath): JsonValueNode | undefined {
    return getValueAt(this.node, path);
  }
}

export function markerAt(
  parent: JsonNode,
  key: jsonc.Segment | undefined,
): SourceRange {
  if (key === undefined) return markerForValue(parent);

  if (parent.type === "array") {
    const item = (parent as JsonArrayNode).children.at(key as number);
    return markerForValue(item ?? parent);
  }

  if (parent.type === "object") {
    const entry = (parent as JsonObjectNode).entry(key as string);
    return entry?.marker ?? markerForValue(parent);
  }

  throw Error(
    `unreachable: ${key} in a parent container, but the parent was not an array or object`,
  );
}

export function markerForValue(value: BaseNode): SourceRange {
  const range = value.range;

  if (value.type === "property") {
    return (value as JsonEntryNode).keyRange;
  } else if (value.type === "array" || value.type === "object") {
    return range.isSingleLine() ? range : range.startCursor.asRange();
  } else {
    return range;
  }
}

export class ModifiableSourceRoot {
  #original: string;
  #root: SourceRoot;

  constructor(root: SourceRoot) {
    this.#original = root.source;
    this.#root = root;
  }

  applyModifications(modifications: JsonModification[]): void {
    let source = this.#root.source;

    for (const modification of modifications) {
      source = modification.applyTo(source);
    }

    this.#root = new SourceRoot(this.#root.name, source);
  }

  async flush(
    write: (value: string) => Promise<void> | void,
  ): Promise<ChangeResult> {
    if (this.#root.source === this.#original) {
      return false;
    }

    await write(this.#root.source);
    return "update";
  }

  getArrayAt(path: jsonc.JSONPath): JsonArrayNode | undefined {
    return this.#root.getArrayAt(path);
  }

  getObjectAt(path: jsonc.JSONPath): JsonObjectNode | undefined {
    return this.#root.getObjectAt(path);
  }

  getValueAt(path: jsonc.JSONPath): JsonValueNode | undefined {
    return this.#root.getValueAt(path);
  }
}

function parse(source: string): jsonc.Node {
  const parsed = jsonc.parseTree(source);

  if (parsed === undefined) {
    throw Error(`Unable to parse JSON (${JSON.stringify(source)})`);
  }

  return parsed;
}
