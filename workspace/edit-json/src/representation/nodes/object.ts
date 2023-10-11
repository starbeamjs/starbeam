import { DisplayStruct, isEmptyArray } from "@starbeam/core-utils";
import * as jsonc from "jsonc-parser";
import type { JsonObject, JsonValue } from "typed-json-utils";

import { modifications } from "../../edits/api.js";
import type { JsonModification } from "../../edits/edits.js";
import type { InsertIntoObjectOptions } from "../../edits/object/insert.js";
import { intoValueNode } from "../../representation/nodes/convert.js";
import { SourceRange, type SourceRoot } from "../../representation/source.js";
import type { EntryJsonNodeFields, JsonValueNode } from "../node.js";
import type { RawJsonEntry, RawJsonObject } from "../raw.js";
import { getRange } from "./abstract.js";
import { BaseNode } from "./base.js";

export class JsonObjectNode extends BaseNode<RawJsonObject, JsonObject> {
  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayStruct(
      "Object",
      {
        value: jsonc.getNodeValue(this.inner) as unknown,
        children: Object.fromEntries(
          this.entries.map((child) => [child.key, child.value]),
        ),
      },
      { description: getRange(this).format() },
    );
  }

  get entries(): JsonEntryNode[] {
    return this.inner.children.map(
      (child) => new JsonEntryNode(this.root, child, this.path),
    );
  }

  get isEmpty(): boolean {
    return isEmptyArray(this.inner.children);
  }

  get size(): number {
    return this.entries.length;
  }

  innerRange(options?: { whitespace: "include" }): SourceRange {
    return options?.whitespace === "include"
      ? getRange(this).inner
      : this.root.rangeAtCursors(getRange(this).inner);
  }

  entry(name: string): JsonEntryNode | undefined {
    return this.entries.find((entry) => entry.key === name);
  }

  delete(key: string): JsonModification {
    return modifications.object.remove(this.root, this, this.path, key);
  }

  set(
    key: string,
    value: JsonValue,
    options: { position: "start" | "end" } | { after: string } = {
      position: "end",
    },
  ): JsonModification {
    const normalizedOptions: InsertIntoObjectOptions =
      "after" in options
        ? {
            position: "after",
            after: options.after,
          }
        : { position: options.position };

    return modifications.object.insert(
      this.root,
      this,
      this.path,
      [key, value],
      normalizedOptions,
    );
  }
}

export class JsonEntryNode extends BaseNode<RawJsonEntry, undefined> {
  readonly #root: SourceRoot;
  readonly #node: RawJsonEntry;
  readonly #path: jsonc.JSONPath;

  constructor(source: SourceRoot, node: RawJsonEntry, path: jsonc.JSONPath) {
    super(source, node, path);
    this.#root = source;
    this.#node = node;
    this.#path = path;
  }

  get [Symbol.toStringTag](): string {
    return "JsonNode";
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const fields: EntryJsonNodeFields = {
      range: getRange(this),
      key: this.key,
      value: this.valueNode,
    };

    return DisplayStruct("JsonEntry", fields, { description: "entry" });
  }

  override get marker(): SourceRange {
    return this.keyRange;
  }

  get key(): string {
    return JSON.parse(this.#root.slice(this.keyRange)) as string;
  }

  get valueNode(): JsonValueNode {
    const [, value] = this.inner.children;
    return intoValueNode(this.root, value, this.path);
  }

  override get path(): jsonc.JSONPath {
    return [...this.#path, this.key];
  }

  get keyRange(): SourceRange {
    return SourceRange.of(this.#root, [
      this.#node.offset,
      this.inner.colonOffset,
    ]);
  }
}
