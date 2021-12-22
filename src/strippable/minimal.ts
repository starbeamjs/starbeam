import type * as minimal from "@domtree/minimal";
import type { Mutable } from "@domtree/minimal";
import type { CompatibleNode } from "../dom/streaming/compatible-dom";

/**
 * @strip.value node
 *
 * @param node
 * @returns
 */
export function mutable<N extends minimal.Node>(node: N): Mutable<N> {
  return node as unknown as Mutable<N>;
}

export const is = {
  Node(node: CompatibleNode | minimal.Node | null): node is minimal.Node {
    // SimpleDOM is missing nodeType on attributes, and SimpleAttr is in
    // CompatibleNode
    return node !== null && "nodeType" in node;
  },

  Element(node: CompatibleNode | minimal.Node | null): node is minimal.Element {
    // SimpleDOM is missing nodeType on attributes, and SimpleAttr is in
    // CompatibleNode
    return is.Node(node) && node.nodeType === 1;
  },

  Attr(node: CompatibleNode | minimal.Node | null): node is minimal.Attr {
    // SimpleDOM is missing ownerElement and nodeType on attributes, which we
    // should fix, but also should catch
    return is.Node(node) && node.nodeType === 2 && "ownerElement" in node;
  },

  Present<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  },
} as const;
