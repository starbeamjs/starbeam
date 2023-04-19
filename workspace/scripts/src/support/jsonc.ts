import { readFileSync, writeFileSync } from "node:fs";

import type { RegularFile } from "@starbeam-workspace/paths";
import { fatal } from "@starbeam-workspace/shared";
import type { Workspace } from "@starbeam-workspace/workspace";
import * as jsonc from "jsonc-parser";
import { format } from "prettier";

export async function parseJsonc(
  file: RegularFile,
  workspace: Workspace
): Promise<Record<string, unknown>> {
  const source = await file.read();
  const node = jsonc.parseTree(source);

  if (node === undefined) {
    fatal(
      workspace.reporter.fatal(
        `Failed to parse tsconfig at '${file.relativeFrom(workspace.root)}'`
      )
    );
  }

  const value = jsonc.getNodeValue(node) as unknown;

  if (value == undefined || typeof value !== "object") {
    fatal(
      workspace.reporter.fatal(
        `Failed to parse tsconfig at '${file.relativeFrom(workspace.root)}'`
      )
    );
  } else {
    return value as Record<string, unknown>;
  }
}

const MISSING_INDEX = -1;

export class EditJsonc {
  static parse(filename: RegularFile): EditJsonc {
    try {
      const source = readFileSync(filename, "utf8");
      return new EditJsonc(filename, source, parse(source));
    } catch {
      return new EditJsonc(filename, "{}", parse("{}"));
    }
  }

  #filename: RegularFile;
  #source: string;
  readonly #original: string;
  #json: jsonc.Node;

  constructor(filename: RegularFile, source: string, json: jsonc.Node) {
    this.#filename = filename;
    this.#source = source;
    this.#original = source;
    this.#json = json;
  }

  remove(path: string): void {
    const jsonPath = this.#path(path);
    const node = jsonc.findNodeAtLocation(this.#json, jsonPath);

    if (node) {
      const edit = jsonc.modify(this.#source, jsonPath, undefined, {});
      this.#source = jsonc.applyEdits(this.#source, edit);
      this.#json = parse(this.#source);
    }
  }

  removeUnique(
    path: string,
    value: string | number | boolean | ((json: unknown) => boolean)
  ): void {
    const jsonPath = this.#path(path);
    const node = jsonc.findNodeAtLocation(this.#json, jsonPath);

    const check =
      typeof value === "function" ? value : (json: unknown) => json === value;

    if (node && node.type === "array") {
      const oldValue = jsonc.getNodeValue(node) as unknown[] | undefined;

      if (oldValue !== undefined) {
        const index = oldValue.findIndex(check);

        if (index !== MISSING_INDEX) {
          const edits = bugfix(
            this.#source,
            jsonc.modify(this.#source, [...jsonPath, index], undefined, {})
          );

          this.#source = jsonc.applyEdits(this.#source, edits);

          this.#json = parse(this.#source);
        }
      }
    }
  }

  addUnique(path: string, value: string | number | boolean): void;
  addUnique(
    path: string,
    value: unknown,
    check: (json: unknown) => boolean
  ): void;
  addUnique(
    path: string,
    value: unknown,
    check: (json: unknown) => boolean = (json) => json === value
  ): void {
    const jsonPath = this.#path(path);
    const node = jsonc.findNodeAtLocation(this.#json, jsonPath);
    let oldValue: unknown[] | undefined;

    if (
      node &&
      node.type === "array" &&
      (oldValue = jsonc.getNodeValue(node) as unknown[] | undefined)
    ) {
      const index = oldValue.findIndex(check);

      const edit = jsonc.modify(this.#source, [...jsonPath, index], value, {});
      this.#source = jsonc.applyEdits(this.#source, edit);
      this.#json = parse(this.#source);
    } else {
      const edit = jsonc.modify(this.#source, jsonPath, [value], {});
      this.#source = jsonc.applyEdits(this.#source, edit);
      this.#json = parse(this.#source);
    }
  }

  set(
    path: string,
    value: unknown,
    { position = MISSING_INDEX }: JsoncPosition = { position: MISSING_INDEX }
  ): void {
    const edit = jsonc.modify(this.#source, this.#path(path), value, {
      getInsertionIndex:
        typeof position === "function" ? position : () => position,
    });

    this.#source = jsonc.applyEdits(this.#source, edit);
    this.#json = parse(this.#source);
  }

  /**
   * Write the JSON to the file. If the JSON is unchanged, the file is not
   * written, and false is returned. If the JSON is changed, the file is
   * written, and true is returned.
   */
  write(): "create" | "update" | "remove" | false {
    const formatted = format(this.#source, { parser: "json" });

    if (formatted !== this.#original) {
      writeFileSync(this.#filename, formatted);
      return "update";
    } else {
      return false;
    }
  }

  #path(source: string): (string | number)[] {
    return source.split(".").map((p) => {
      if (/^\d+$/.test(p)) {
        return Number(p);
      } else {
        return p;
      }
    });
  }
}

export type JsoncPosition =
  | { position: number }
  | { position: (siblings: string[]) => number }
  | undefined;

function parse(source: string): jsonc.Node {
  const parsed = jsonc.parseTree(source);

  if (parsed === undefined) {
    throw Error(`Unable to parse JSON (${JSON.stringify(source)})`);
  }

  return parsed;
}

const SINGLE_ITEM = 1;
const NEXT_CHAR = 1;

function hasOneItem<T>(array: T[] | undefined): array is [T] {
  return array !== undefined && array.length === SINGLE_ITEM;
}

/**
 * There is an upstream bug in jsonc-parser when removing the last array entry. When this bug
 * occurs, the edit is one character too short, which causes the JSON to retain the last character
 * of the original value. This function detects this case and fixes it.
 *
 * There's a missing test case [in their test suite](https://github.com/microsoft/node-jsonc-parser/blob/33f744b7e51a8f254f9b09cb2544ef3432e930aa/src/test/edit.test.ts#L209-L225).
 *
 * The bug is in [edit.ts](https://github.com/microsoft/node-jsonc-parser/blame/main/src/impl/edit.ts#L113)
 */
function bugfix(source: string, edits: jsonc.Edit[]): jsonc.Edit[] {
  if (hasOneItem(edits)) {
    const [edit] = edits;
    const end = edit.offset + edit.length;

    const nextOffset = end + NEXT_CHAR;

    const next = source.substring(nextOffset, nextOffset + NEXT_CHAR);

    if (next === "]") {
      return [{ ...edit, length: edit.length + NEXT_CHAR }];
    }

    return edits;
  }

  return edits;
}
