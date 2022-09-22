import { readFileSync, writeFileSync } from "node:fs";
import * as jsonc from "jsonc-parser";
import { format } from "prettier";

export class EditJsonc {
  static parse(filename: string): EditJsonc {
    try {
      const source = readFileSync(filename, "utf8");
      return new EditJsonc(filename, source, parse(source));
    } catch {
      return new EditJsonc(filename, "{}", parse("{}"));
    }
  }

  #filename: string;
  #source: string;
  #json: jsonc.Node;

  constructor(filename: string, source: string, json: jsonc.Node) {
    this.#filename = filename;
    this.#source = source;
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

    if (node && node.type === "array") {
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

  write(): void {
    const formatted = format(this.#source, { parser: "json" });
    writeFileSync(this.#filename, formatted);
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
