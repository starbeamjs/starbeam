import type * as jsonc from "jsonc-parser";

import {
  type JsoncValueNode,
  type JsonNode,
  type JsonValueNode,
} from "../node.js";
import type {
  RawJsonArray,
  RawJsonEntry,
  RawJsonObject,
  RawJsonPrimitive,
} from "../raw.js";
import type { SourceRoot } from "../source.js";
import { JsonArrayNode } from "./array.js";
import { JsonEntryNode, JsonObjectNode } from "./object.js";
import { JsonPrimitiveNode } from "./primitive.js";

export function intoNode(
  source: SourceRoot,
  node: jsonc.Node,
  path: jsonc.JSONPath,
): JsonNode {
  if (node.type === "property") {
    return new JsonEntryNode(source, node as RawJsonEntry, path);
  } else {
    return intoValueNode(source, node as JsoncValueNode, path);
  }
}

export function intoValueNode(
  source: SourceRoot,
  node: JsoncValueNode,
  path: jsonc.JSONPath,
): JsonValueNode {
  switch (node.type) {
    case "array":
      return new JsonArrayNode(source, node as RawJsonArray, path);
    case "boolean":
    case "null":
    case "number":
    case "string":
      return new JsonPrimitiveNode(source, node as RawJsonPrimitive, path);
    case "object":
      return new JsonObjectNode(source, node as RawJsonObject, path);
  }
}
