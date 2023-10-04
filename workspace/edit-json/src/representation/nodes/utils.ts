import type * as jsonc from "jsonc-parser";

import type { JsoncValueNode } from "../node.js";

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
