import type { anydom, minimal } from "@domtree/flavors";

export function isElement(node: anydom.Node): node is minimal.Element {
  return node.nodeType === 1;
}
