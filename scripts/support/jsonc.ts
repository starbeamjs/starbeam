import { readFileSync, writeFileSync } from "node:fs";
import * as jsonc from "jsonc-parser";
import { format } from "prettier";
import type { RegularFile } from "./paths.js";

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
    const edit = jsonc.modify(this.#source, jsonPath, undefined, {});
    this.#source = jsonc.applyEdits(this.#source, edit);
    this.#json = parse(this.#source);
  }

  addUnique(
    path: string,
    value: unknown,
    check: (json: unknown) => boolean
  ): void {
    if (check(this.#json)) {
      return;
    }

    jsonc.findNodeAtLocation;

    const jsonPath = this.#path(path);
    const node = jsonc.findNodeAtLocation(this.#json, jsonPath);

    if (node && node.type === "array" && node.value) {
      const value = node.value as unknown[];
      const index = value.findIndex((v) => check(v));

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
    {
      position = -1,
    }: { position?: number | ((siblings: string[]) => number) } = {}
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

  #path(source: string) {
    return source.split(".").map((p) => {
      if (/^\d+$/.test(p)) {
        return Number(p);
      } else {
        return p;
      }
    });
  }
}

function parse(source: string): jsonc.Node {
  const parsed = jsonc.parseTree(source);

  if (parsed === undefined) {
    throw Error(`Unable to parse JSON (${JSON.stringify(source)})`);
  }

  return parsed;
}
