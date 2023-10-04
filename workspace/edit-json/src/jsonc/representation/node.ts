import type * as jsonc from "jsonc-parser";

import type { JsonValueNode } from "../../representation/node.js";
import type { SourceRange } from "../../representation/source.js";

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
