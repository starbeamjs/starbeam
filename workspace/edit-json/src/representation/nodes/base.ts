import type { JsonValue } from "@starbeam-workspace/json";
import * as jsonc from "jsonc-parser";

import type { JsonNode } from "../node.js";
import type { RawNode } from "../raw.js";
import {
  markerAt,
  markerForValue,
  SourceRange,
  type SourceRoot,
} from "../source.js";

export class BaseNode<
  N extends RawNode = RawNode,
  V extends JsonValue | undefined = JsonValue | undefined,
> {
  readonly #root: SourceRoot;
  readonly #path: jsonc.JSONPath;
  readonly #parentPath: jsonc.JSONPath;
  readonly #base: jsonc.Segment | undefined;
  readonly #node: N;

  constructor(source: SourceRoot, node: N, path: jsonc.JSONPath) {
    this.#root = source;
    this.#path = path;
    this.#node = node;

    const parent = [...path];
    this.#base = parent.pop();
    this.#parentPath = parent;
  }

  /**
   * A marker is a part of this node's source range that represents it well
   * enough to be useful in diagnostics.
   */
  get marker(): SourceRange {
    const parent = this.parent;

    if (parent) {
      return markerAt(parent, this.base);
    } else {
      return markerForValue(this);
    }
  }

  get parentPath(): jsonc.JSONPath {
    return this.#parentPath;
  }

  get parent(): JsonNode | undefined {
    return this.#root.getValueAt(this.parentPath);
  }

  get base(): jsonc.Segment | undefined {
    return this.#base;
  }

  get type(): jsonc.NodeType {
    return this.#node.type;
  }

  get value(): V {
    return jsonc.getNodeValue(this.#node) as V;
  }

  get range(): SourceRange {
    const { offset, length } = this.#node;
    return SourceRange.of(this.root, [offset, offset + length]);
  }

  get root(): SourceRoot {
    return this.#root;
  }

  get path(): jsonc.JSONPath {
    return this.#path;
  }

  get inner(): N {
    return this.#node;
  }

  get raw(): jsonc.Node {
    return this.#node;
  }
}

export type AnyNode = BaseNode<RawNode, JsonValue | undefined>;
