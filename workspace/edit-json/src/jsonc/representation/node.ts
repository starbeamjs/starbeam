import type * as jsonc from "jsonc-parser";

export type JsoncValueNode = jsonc.Node & {
  type: Exclude<jsonc.NodeType, "property">;
};
