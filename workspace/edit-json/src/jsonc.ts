import { readFileSync, writeFileSync } from "node:fs";

import type { ErrorReporter } from "@starbeam-workspace/shared";
import * as jsonc from "jsonc-parser";
import { format } from "prettier";
import type { RegularFile } from "trailway";
import type { JsonValue } from "typed-json-utils";

export async function parseJsonc(
  reporter: ErrorReporter,
  file: RegularFile,
  error: (message: string) => never,
): Promise<Record<string, unknown>> {
  const source = await file.read();
  const node = jsonc.parseTree(source);

  if (node === undefined) {
    throw error(`Failed to parse ${file.basename}`);
  }

  const value = jsonc.getNodeValue(node) as unknown;

  if (value == undefined || typeof value !== "object") {
    throw error(`Failed to parse ${file.basename}`);
  } else {
    return value as Record<string, unknown>;
  }
}

export const MISSING_INDEX = -1;

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

  #modify(
    path: string,
    callback: (options: {
      path: jsonc.Segment[];
      json: jsonc.Node | undefined;
      source: string;
    }) => AbstractModification[],
  ): void {
    const jsonPath = parsePath(path);
    const node = jsonc.findNodeAtLocation(this.#json, jsonPath);
    let source = this.#source;

    const modifications = callback({
      path: jsonPath,
      json: node,
      source,
    });

    for (const modification of modifications) {
      source = applyModification(source, modification);
    }

    this.#source = source;
    this.#json = parse(source);
  }

  remove(path: string): void {
    const jsonPath = parsePath(path);
    const node = jsonc.findNodeAtLocation(this.#json, jsonPath);

    if (node) {
      const edit = jsonc.modify(this.#source, jsonPath, undefined, {});
      this.#source = jsonc.applyEdits(this.#source, edit);
      this.#json = parse(this.#source);
    }
  }

  removeUnique(
    path: string,
    value: string | number | boolean | ((json: unknown) => boolean),
  ): void {
    const jsonPath = parsePath(path);
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
            jsonc.modify(this.#source, [...jsonPath, index], undefined, {}),
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
    value: JsonValue,
    check: (json: unknown) => boolean,
  ): void;
  addUnique(
    path: string,
    value: JsonValue,
    check: (json: unknown) => boolean = (json) => json === value,
  ): void {
    this.#modify(path, ({ json: node, path: jsonPath }) => {
      if (node && node.type === "array") {
        const oldValue = jsonc.getNodeValue(node) as jsonc.Node[] | undefined;

        if (oldValue) {
          const [index, ...rest] = findIndexes(oldValue, check);

          if (index === undefined) {
            return [{ path: [...jsonPath, oldValue.length], value }];
          } else {
            return [
              { path: [...jsonPath, index], value },
              ...computeRemovals(rest).map((index) => ({
                path: [...jsonPath, index],
              })),
            ];
          }
        }
      }

      return [{ path: jsonPath, value: [value] }];
    });
  }

  set(
    path: string,
    value: unknown,
    { position = MISSING_INDEX }: JsoncPosition = { position: MISSING_INDEX },
  ): void {
    const edit = jsonc.modify(this.#source, parsePath(path), value, {
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
  async write(): Promise<"create" | "update" | "remove" | false> {
    const formatted = await format(this.#source, { parser: "json" });

    if (formatted !== this.#original) {
      writeFileSync(this.#filename, formatted);
      return "update";
    } else {
      return false;
    }
  }
}

function parsePath(source: string): jsonc.Segment[] {
  return source.split(".").map((p) => {
    if (/^\d+$/.test(p)) {
      return Number(p);
    } else {
      return p;
    }
  });
}

function applyModification(
  source: string,
  modification: AbstractModification,
): string {
  const { path, value = undefined } = modification;

  const node = jsonc.findNodeAtLocation(parse(source), path);
  // eslint-disable-next-line no-console
  console.log({ node });

  const edit = jsonc.modify(source, path, value, {});
  // eslint-disable-next-line no-console
  console.group("applying", { modification, edit, source: typeof source });
  // eslint-disable-next-line no-console
  console.log("before", source);
  const after = jsonc.applyEdits(source, edit);
  // eslint-disable-next-line no-console
  console.log("after", after);
  // eslint-disable-next-line no-console
  console.groupEnd();
  return after;
}

export type JsoncPosition =
  | { position: number }
  | { position: (siblings: string[]) => number }
  | undefined;

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

function findIndexes(
  array: unknown[],
  predicate: (value: unknown) => boolean,
): number[] {
  return array.flatMap((value, index) => (predicate(value) ? [index] : []));
}

function computeRemovals(offsets: number[]): number[] {
  // as we remove an offset, subsequent offsets are shifted

  let removed = 0;
  const shiftedOffsets: number[] = [];

  for (const offset of offsets) {
    shiftedOffsets.push(offset - removed++);
  }

  return shiftedOffsets;
}

interface AbstractModification {
  readonly path: jsonc.Segment[];
  readonly value?: JsonValue;
}
export function parse(source: string): jsonc.Node {
  const parsed = jsonc.parseTree(source);

  if (parsed === undefined) {
    throw Error(`Unable to parse JSON (${JSON.stringify(source)})`);
  }

  return parsed;
}
