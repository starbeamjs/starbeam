import type * as jsonc from "jsonc-parser";

import type { JsoncValueNode, JsonValueNode } from "../node.js";
import type { RawJsonEntry } from "../raw.js";
import type { SourceRoot } from "../source.js";
import { intoValueNode } from "./convert.js";
import { JsonEntryNode } from "./object.js";

export function assertValueNode(
  node: jsonc.Node,
  context: string,
): asserts node is JsoncValueNode {
  if (!isValueNode(node)) {
    throw new Error(
      `BUG: ${context} cannot be an entry node (type='property')`,
    );
  }
}

export function isValueNode(node: jsonc.Node): node is JsoncValueNode {
  return node.type !== "property";
}

export function isArrayNode(node: jsonc.Node): node is JsoncValueNode {
  return node.type === "array";
}

export function isObjectNode(node: jsonc.Node): node is JsoncValueNode {
  return node.type === "object";
}

export function intoJsonNode(
  source: SourceRoot,
  node: jsonc.Node,
  path: jsonc.JSONPath,
): JsonValueNode | JsonEntryNode {
  if (node.type === "property") {
    return new JsonEntryNode(source, node as RawJsonEntry, path);
  } else {
    return intoValueNode(source, node as JsoncValueNode, path);
  }
}
