import * as jsonc from "jsonc-parser";

import type { JsoncValueNode } from "../../jsonc/representation/node.js";
import type { JsonNode, JsonValueNode } from "../node.js";
import { SourceRange } from "../source.js";
import type { JsonArrayNode } from "./array.js";
import type { AnyNode } from "./base.js";
import { intoNode, intoValueNode } from "./convert.js";
import type { JsonObjectNode } from "./object.js";
import { isArrayNode, isObjectNode, isValueNode } from "./utils.js";

export type IntoJsonPath = jsonc.Segment | jsonc.JSONPath;

function wrap<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function getIndex(node: AnyNode): number | undefined {
  const path = [...node.path];
  const index = path.pop();

  if (typeof index === "number") return index;
}

export function getRange(node: AnyNode): SourceRange {
  const { offset, length } = node.raw;
  return SourceRange.of(node.root, [offset, offset + length]);
}

export function getPosition(
  node: AnyNode | undefined,
):
  | { at: "first"; next: JsonNode }
  | { at: "last"; prev: JsonNode }
  | { at: "middle"; prev: JsonNode; next: JsonNode }
  | { at: "only" }
  | undefined {
  if (node === undefined) return;

  const siblings = node.raw.parent?.children;
  const index = siblings?.indexOf(node.raw);

  if (!siblings || index === undefined) {
    // @todo maybe consider ItemValueNode? Not sure if it's useful enough.
    return undefined;
  }

  if (index === FIRST_INDEX) {
    const next = siblings.at(SECOND_INDEX);

    if (next) {
      return {
        at: "first",
        next: intoNode(node.root, next, [...node.path, SECOND_INDEX]),
      };
    } else {
      return { at: "only" };
    }
  }

  const nextJsonc = siblings.at(index + INDEX_INCREMENT);
  const prevJsonc = siblings.at(index - INDEX_INCREMENT);

  if (!prevJsonc) {
    throw Error(`BUG: Index was not 0 but no previous element was found.`);
  }

  const prev = intoNode(node.root, prevJsonc, node.path);

  if (nextJsonc) {
    const next = intoNode(node.root, nextJsonc, node.path);

    return {
      at: "middle",
      prev,
      next,
    };
  } else {
    return { at: "last", prev };
  }
}

export function getArrayAt(
  node: JsonValueNode,
  path: IntoJsonPath,
): JsonArrayNode | undefined {
  return getValueAt(node, path, isArrayNode) as JsonArrayNode | undefined;
}

export function getObjectAt(
  node: JsonValueNode,
  path: IntoJsonPath,
): JsonObjectNode | undefined {
  return getValueAt(node, path, isObjectNode) as JsonObjectNode | undefined;
}

export function getValueAt(
  node: JsonValueNode,
  path: IntoJsonPath,
): JsonValueNode | undefined;
export function getValueAt<T extends JsoncValueNode>(
  node: JsonValueNode,
  path: IntoJsonPath,
  check: (value: jsonc.Node) => value is T,
): JsonValueNode | undefined;
export function getValueAt(
  node: JsonValueNode,
  path: IntoJsonPath,
  check: (value: jsonc.Node) => value is JsoncValueNode = isValueNode,
): JsonValueNode | undefined {
  const fullPath = [...node.path, ...wrap(path)];
  const root = node.root;

  const jsoncNode = jsonc.findNodeAtLocation(root.node.raw, fullPath);

  return jsoncNode && check(jsoncNode)
    ? intoValueNode(root, jsoncNode, fullPath)
    : undefined;
}

const FIRST_INDEX = 0;
const SECOND_INDEX = 1;
const INDEX_INCREMENT = 1;
