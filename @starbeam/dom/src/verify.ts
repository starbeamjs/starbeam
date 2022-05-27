import type * as dom from "@domtree/any";
import type { anydom } from "@domtree/flavors";
import type * as minimal from "@domtree/minimal";
import { expected, isPresent } from "@starbeam/verify";

/**
 * @strip.value node
 *
 * @param node
 * @returns
 */
export function mutable<N extends minimal.Node>(node: N): minimal.Mutable<N> {
  return node as unknown as minimal.Mutable<N>;
}

const NODE_NAMES = {
  1: ["an", "Element"],
  2: ["an", "Attribute"],
  3: ["a", "Text"],
  4: ["a", "CDATA"],
  7: ["a", "Processing Instruction"],
  8: ["a", "Comment"],
  9: ["a", "Document"],
  10: ["a", "Doctype"],
  11: ["a", "Document Fragment"],
} as const;

function describe(node: minimal.Node): string {
  let [article, title] = NODE_NAMES[node.nodeType];

  return `${article} ${title} node`;
}

export type ELEMENT_NODE = 1;
export type ATTRIBUTE_NODE = 2;
export type TEXT_NODE = 3;
export type CDATA_SECTION_NODE = 4;
export type PROCESSING_INSTRUCTION_NODE = 7;
export type COMMENT_NODE = 8;
export type DOCUMENT_NODE = 9;
export type DOCUMENT_TYPE_NODE = 10;
export type DOCUMENT_FRAGMENT_NODE = 11;

type MaybeNode = dom.Node | null;

function nodeMessage(actual: dom.Node | null): string {
  if (isPresent(actual)) {
    return describe(minimize(actual));
  } else {
    return `null`;
  }
}

function isSpecificNode<T extends minimal.Node>(
  nodeType: number,
  description: string
): (node: MaybeNode) => node is T {
  const isSpecificNode = (node: MaybeNode): node is T => {
    return isPresent(node) && node.nodeType === nodeType;
  };

  expected.associate(
    isSpecificNode,
    expected("node").toBe(description).butGot(nodeMessage)
  );

  return isSpecificNode;
}

export function isParentNode(node: MaybeNode): node is minimal.ParentNode {
  if (!isPresent(node)) {
    return false;
  }

  return isElement(node) || isDocument(node) || isDocumentFragment(node);
}

expected.associate(isParentNode, expected("node").toBe("parent node"));

export const isElement = isSpecificNode<minimal.Element>(1, "an element");
export const isText = isSpecificNode<minimal.Text>(3, "a text node");
export const isComment = isSpecificNode<minimal.Comment>(8, "a comment node");
export const isDocument = isSpecificNode<minimal.Document>(9, "a document");
export const isDocumentFragment = isSpecificNode<minimal.DocumentFragment>(
  11,
  "a document fragment"
);

export function isCharacterData(
  node: MaybeNode
): node is minimal.Text | minimal.Comment {
  return isText(node) || isComment(node);
}

expected.associate(
  isCharacterData,
  expected("node").toBe("a text or comment node").butGot(nodeMessage)
);

export const isAttr = isSpecificNode<minimal.Attr>(2, "an attribute node");

export function isTemplateElement(
  node: MaybeNode
): node is minimal.TemplateElement {
  return isElement(node) && hasTagName("template")(node);
}

expected.associate(
  isTemplateElement,
  expected("node").toBe("a template node").butGot(nodeMessage)
);

// TODO: Deal with SVG and MathML tag names
export function hasTagName<T extends string>(
  tagName: T
): (
  value: minimal.Element
) => value is minimal.Element & { readonly tagName: Uppercase<T> } {
  function hasTagName(
    element: minimal.Element
  ): element is minimal.Element & { readonly tagName: Uppercase<T> } {
    return element.tagName === tagName.toUpperCase();
  }

  return expected.associate(
    hasTagName,
    expected("element")
      .toBe(`<${tagName}>`)
      .butGot(
        (element: minimal.Element) => `<${element.tagName.toLowerCase()}>`
      )
  );
}

/**
 * @strip {value} node
 */
export function minimize<
  N extends anydom.Node | anydom.LiveRange | anydom.StaticRange
>(node: N): dom.Minimal<N> {
  return node as dom.Minimal<N>;
}
