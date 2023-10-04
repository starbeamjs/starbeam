import type * as jsonc from "jsonc-parser";

import type { JsonArrayNode } from "./nodes/array.js";
import type { JsonEntryNode, JsonObjectNode } from "./nodes/object.js";
import type { JsonPrimitiveNode } from "./nodes/primitive.js";
import type { SourceRange } from "./source.js";

export type JsonValueNode = JsonPrimitiveNode | JsonArrayNode | JsonObjectNode;
export type JsonNode = JsonValueNode | JsonEntryNode;

export type JsoncValueNode = jsonc.Node & {
  type: Exclude<jsonc.NodeType, "property">;
};

export interface ValuedJsonNodeFields {
  value?: unknown;
  children?: JsonValueNode[] | Record<string, JsonValueNode>;
  colonOffset?: number;
}

export interface EntryJsonNodeFields {
  range: SourceRange;
  key: string;
  value: JsonValueNode;
}

export function nextOffset(offset: number): number {
  return offset + INCREMENT_OFFSET;
}

export function prevOffset(offset: number): number {
  return offset - INCREMENT_OFFSET;
}

const INCREMENT_OFFSET = 1;
