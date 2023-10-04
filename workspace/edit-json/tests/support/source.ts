import { type JsonValueNode, SourceRoot } from "@starbeam-workspace/edit-json";

import { strippedJSON } from "./stripped.js";

export function testSource(
  constant: TemplateStringsArray,
  ...values: string[]
): {
  source: string;
  node: JsonValueNode;
} {
  const source = strippedJSON(constant, ...values);

  const file = new SourceRoot("tsconfig.json", source);

  return {
    source,
    node: file.node,
  };
}
