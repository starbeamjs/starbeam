import type * as browser from "@domtree/browser";
import type * as minimal from "@domtree/minimal";
import type { Mutable } from "@domtree/minimal";
import type * as simple from "@domtree/simple";
import * as global from "./global-dom";
import { is, mutable } from "../../strippable/minimal";
import { verify, exhaustive, assert } from "../../strippable/assert";

import {
  HTML_NAMESPACE,
  MATHML_NAMESPACE,
  SVG_NAMESPACE,
  XLINK_NAMESPACE,
  XMLNS_NAMESPACE,
  XML_NAMESPACE,
} from "../tree-construction/foreign";

export type CompatibleDocument =
  | browser.Document
  | simple.Document
  | minimal.Document;

export type CompatibleCharacterData =
  | browser.Text
  | simple.Text
  | minimal.Text
  | browser.Comment
  | simple.Comment
  | minimal.Comment;

export type CompatibleDocumentFragment =
  | browser.DocumentFragment
  | simple.DocumentFragment
  | minimal.DocumentFragment;

export type CompatibleParentNode =
  | browser.ParentNode
  | simple.ParentNode
  | minimal.ParentNode;

export type CompatibleChildNode =
  | browser.ChildNode
  | simple.ChildNode
  | minimal.ChildNode;

export type CompatibleElement =
  | browser.Element
  | simple.Element
  | minimal.Element;

export type CompatibleTemplateElement =
  | browser.TemplateElement
  | simple.TemplateElement
  | minimal.TemplateElement;

export type CompatibleAttr = browser.Attr | simple.Attr | minimal.Attr;

export type CompatibleNode =
  | CompatibleCharacterData
  | CompatibleParentNode
  | CompatibleChildNode
  | CompatibleAttr;

export type Hydrated =
  | {
      type: "range";
      range: [start: minimal.Node, end: minimal.Node];
    }
  | {
      type: "node";
      node: minimal.Node;
    }
  | {
      type: "attr";
      element: minimal.Element;
      attr: minimal.Attr;
    };

export interface ContentCursor {
  parent: minimal.ParentNode;
  next: minimal.Node | null;
}

export type ContentRange =
  | {
      type: "range";
      nodes: [first: minimal.ChildNode, last: minimal.ChildNode];
    }
  | {
      type: "node";
      node: minimal.ChildNode;
    };

export type IntoContentRange =
  | [minimal.ChildNode]
  | [start: minimal.ChildNode, end: minimal.ChildNode];

export function ContentRange(...[first, last]: IntoContentRange): ContentRange {
  if (last === undefined || first === last) {
    return {
      type: "node",
      node: first,
    };
  } else {
    assert(
      first.parentNode === last.parentNode,
      `The first and last node in a ContentRange must have the same parent`
    );

    return {
      type: "range",
      nodes: [first, last],
    };
  }
}

export class AbstractDOM {
  getNodeType(node: CompatibleNode): number {
    verify(node, is.Node);
    return node.nodeType;
  }

  createText(document: CompatibleDocument, data: string): minimal.Text {
    return (document as minimal.Document).createTextNode(data);
  }

  createComment(document: CompatibleDocument, data: string): minimal.Comment {
    return (document as minimal.Document).createComment(data);
  }

  getData(data: CompatibleCharacterData): string {
    return (data as minimal.CharacterData).data;
  }

  setData(data: CompatibleCharacterData, value: string): void {
    (data as minimal.Mutable<minimal.CharacterData>).data = value;
  }

  /**
   * ## MathML Integration Points
   *
   * A MathML annotation-xml element is an HTML integration point if it has an
   * `encoding` attribute whose value is either "text/html" or
   * "application/xhtml+xml".
   *
   * Since this is the only part of the HTML tree construction semantics that
   * has different behavior when constructing *elements* based upon an element's
   * attributes, we treat this case as special.
   *
   * Essentially: `annotation-xml[encoding=text/html|application/xhtml+xml]` is
   * treated as if it was a separate *tag*, so that we don't need to pass
   * arbitrary attributes to element-based APIs.
   *
   * Since the identification of HTML integration points occurs prior to
   * processing in the HTML spec, this distinction is semantically important:
   * the `annotation-xml` attribute is identified *prior* to attribute
   * normalization (which occurs once an appropriate insertion mode is
   * determined). This detail makes
   * `annotation-xml[encoding=text/html|application/xhtml+xml]` more like a
   * special syntax for a tag than an element plus an attribute.
   *
   * @param document
   * @param qualifiedName the post-normalization tag name
   * @param options.parent
   * @param options.encoding
   * @returns
   */
  createElement(
    document: CompatibleDocument,
    qualifiedName: string,
    {
      parent,
      encoding,
    }: {
      parent: CompatibleElement;
      encoding?: string;
    }
  ): minimal.Element {
    let ns = getElementNS(
      parent as minimal.Element,
      qualifiedName,
      encoding || null
    );
    return (document as minimal.Document).createElementNS(ns, qualifiedName);
  }

  updateAttr(attr: CompatibleAttr, value: string | null): void {
    verify(attr, is.Attr);
    if (value === null) {
      COMPATIBLE_DOM.removeAttr(attr);
    } else {
      mutable(attr).value = value;
    }
  }

  removeAttr(attr: CompatibleAttr): void {
    verify(attr, is.Attr);
    let element = attr.ownerElement;

    if (element) {
      mutable(element).removeAttribute(COMPATIBLE_DOM.attrQualifiedName(attr));
    }
  }

  /**
   * This API assumes that a qualifiedName like `xlink:href` was created with
   * the correct namespace.
   *
   * @param element
   * @param qualifiedName
   */
  getAttr(
    element: CompatibleElement,
    qualifiedName: string
  ): minimal.Attr | null {
    if ("getAttributeNode" in element) {
      return (element as minimal.Element).getAttributeNode(qualifiedName);
    } else {
      let attrs = (element as simple.Element).attributes;

      for (let i = 0; i < attrs.length; i++) {
        let attr = attrs[i];
        if (attr.name === qualifiedName) {
          return attr as unknown as minimal.Attr;
        }
      }

      return null;
    }
  }

  /**
   * This API lightly normalizes [foreign attributes] according to the spec.
   * This allows setAttr and getAttr to both take a `qualifiedName`.
   *
   * [foreign attributes]:
   * https://html.spec.whatwg.org/multipage/parsing.html#adjust-foreign-attributes
   */
  setAttr(
    element: CompatibleElement,
    qualifiedName: string,
    value: string
  ): void {
    let ns = getAttrNS(element as minimal.Element, qualifiedName);

    mutable(element as minimal.Element).setAttributeNS(
      ns,
      qualifiedName,
      value
    );
  }

  hasAttr(element: CompatibleElement, qualifiedName: string): boolean {
    if ("hasAttribute" in element) {
      return element.hasAttribute(qualifiedName);
    } else {
      return !!element.getAttribute(qualifiedName);
    }
  }

  attrQualifiedName(attr: CompatibleAttr): string {
    if (attr.prefix) {
      return `${attr.prefix}:${attr.localName}`;
    } else {
      return attr.localName;
    }
  }

  insert(
    node: CompatibleChildNode | CompatibleDocumentFragment,
    { parent, next }: ContentCursor
  ): void {
    (parent as Mutable<minimal.ParentNode>).insertBefore(
      node as minimal.ChildNode | minimal.DocumentFragment,
      next
    );
  }

  replace(
    node: CompatibleChildNode,
    withNode: CompatibleChildNode | CompatibleDocumentFragment
  ): void {
    let cursor = COMPATIBLE_DOM.remove(node);

    if (!cursor) {
      throw new Error(
        "Unexpected: replace() was called with an element that had no parent."
      );
    }

    COMPATIBLE_DOM.insert(withNode, cursor);
  }

  remove(child: CompatibleChildNode): ContentCursor | null {
    let parent = child.parentNode as minimal.ParentNode | null;
    let next = child.nextSibling as minimal.Node | null;

    if ("remove" in child) {
      (child as Mutable<minimal.ChildNode>).remove();
    } else {
      let parent = child.parentNode as simple.ParentNode;
      if (parent) {
        parent.removeChild(child as simple.Node);
      }
    }

    if (parent) {
      return { parent, next };
    } else {
      return null;
    }
  }

  getTemplateContents(
    element: CompatibleTemplateElement
  ): minimal.DocumentFragment {
    if ("content" in element) {
      return element.content as minimal.DocumentFragment;
    } else {
      let frag = element.ownerDocument.createDocumentFragment();
      let current = element.firstChild;

      while (current) {
        let next = current.nextSibling;
        frag.appendChild(current);
        current = next;
      }

      return frag as minimal.DocumentFragment;
    }
  }

  findAll(
    parent: CompatibleParentNode,
    {
      tag,
      attributes,
    }: { tag?: string; attributes?: { any: readonly string[] } }
  ) {
    if ("querySelectorAll" in parent) {
      let selector = buildSelector(tag || null, attributes?.any || null);
      return [
        ...(parent.querySelectorAll(
          selector
        ) as unknown as Iterable<minimal.Element>),
      ];
    } else {
      return findAll(
        parent as minimal.Element,
        tag || null,
        attributes?.any || null
      );
    }
  }
}

/**
 * The methods of this class are conveniences, and operate on minimal DOM.
 */
export class MinimalUtilities {
  removeRange(nodes: ContentRange): ContentCursor {
    let staticRange = MINIMAL_DOM.#createStaticRange(nodes);
    let cursor = MINIMAL_DOM.#cursorAfterStaticRange(staticRange);

    MINIMAL_DOM.#createLiveRange(staticRange).deleteContents();

    return cursor;
  }

  cursorAfterRange(nodes: ContentRange): ContentCursor {
    let staticRange = MINIMAL_DOM.#createStaticRange(nodes);
    return MINIMAL_DOM.#cursorAfterStaticRange(staticRange);
  }

  #cursorAfterStaticRange(staticRange: minimal.StaticRange): ContentCursor {
    let end = staticRange.endContainer;
    let parent = end.parentNode as minimal.ParentNode | null;

    verify(
      parent,
      is.Present,
      () => `expected parent of ${end} to be present, but it was null`
    );

    let next = end.nextSibling as minimal.ChildNode | null;
    return { parent, next };
  }

  #createLiveRange(staticRange: minimal.StaticRange): minimal.LiveRange {
    let liveRange = new global.Range() as minimal.LiveRange;
    liveRange.setStart(
      staticRange.startContainer as minimal.ChildNode,
      staticRange.startOffset
    );
    liveRange.setEnd(
      staticRange.endContainer as minimal.ChildNode,
      staticRange.endOffset
    );
    return liveRange;
  }

  #createStaticRange(range: ContentRange): minimal.StaticRange {
    let start = range.type === "node" ? range.node : range.nodes[0];
    let end = range.type === "node" ? range.node : range.nodes[1];

    return new global.StaticRange({
      startContainer: start as browser.ChildNode,
      endContainer: end as browser.ChildNode,
      startOffset: 0,
      endOffset: 0,
    }) as minimal.StaticRange;
  }
}

export const COMPATIBLE_DOM = new AbstractDOM();
export const MINIMAL_DOM = new MinimalUtilities();

function qualifiedName(element: minimal.Element) {
  if (element.namespaceURI === HTML_NAMESPACE) {
    return element.tagName.toLowerCase();
  } else {
    return element.tagName;
  }
}

function findAll(
  parent: minimal.ParentNode,
  tag: string | null,
  attributes: readonly string[] | null,
  nodes: minimal.Element[] = []
): readonly minimal.Element[] {
  if (parent.nodeType === 1) {
    if (match(parent, tag, attributes)) {
      nodes.push(parent);
    }
  }

  let current = parent.firstChild;

  while (current) {
    if (isParentNode(current)) {
      findAll(current, tag, attributes, nodes);
    }

    current = current.nextSibling;
  }

  return nodes;
}

function isParentNode(node: minimal.Node): node is minimal.ParentNode {
  return node.nodeType === 1 || node.nodeType === 9 || node.nodeType === 10;
}

function match(
  element: minimal.Element,
  tag: string | null,
  attributes: readonly string[] | null
): boolean {
  if (tag && qualifiedName(element) !== tag) {
    return false;
  }

  if (
    attributes &&
    attributes.every((a) => !COMPATIBLE_DOM.hasAttr(element, a))
  ) {
    return false;
  }

  return true;
}

function buildSelector(
  tag: string | null,
  attributes: readonly string[] | null
): string {
  if (tag === null) {
    if (attributes === null) {
      return "*";
    } else {
      return attributes.map((attr) => `[${attr}]`).join(",");
    }
  } else {
    if (attributes === null) {
      return tag;
    } else {
      return attributes.map((attr) => `${tag}[${attr}]`).join(",");
    }
  }
}

function isHtmlElement(element: minimal.Element): boolean {
  return element.namespaceURI === HTML_NAMESPACE;
}

function getElementNS(
  parent: minimal.Element,
  qualifiedName: string,
  encoding: string | null
): minimal.ElementNamespace {
  switch (parent.namespaceURI) {
    case SVG_NAMESPACE:
      switch (qualifiedName) {
        case "foreignObject":
        case "desc":
        case "title":
          return HTML_NAMESPACE;
        default:
          return SVG_NAMESPACE;
      }

    case MATHML_NAMESPACE:
      if (
        (qualifiedName === "annotation-xml" && encoding === "text/html") ||
        encoding === "application/xhtml+xml"
      ) {
        return HTML_NAMESPACE;
      } else {
        return MATHML_NAMESPACE;
      }

    case HTML_NAMESPACE:
      switch (qualifiedName) {
        case "svg":
          return SVG_NAMESPACE;
        case "math":
          return MATHML_NAMESPACE;
        default:
          return HTML_NAMESPACE;
      }

    default:
      exhaustive(parent.namespaceURI, "Element.namespaceURI");
  }
}

function getAttrNS(
  element: minimal.Element,
  name: string
): minimal.AttributeNamespace | null {
  if (isHtmlElement(element as minimal.Element)) {
    return null;
  }

  switch (name) {
    case "xlink:actuate":
    case "xlink:arcrole":
    case "xlink:href":
    case "xlink:role":
    case "xlink:show":
    case "xlink:title":
    case "xlink:type":
      return XLINK_NAMESPACE;
    case "xml:lang":
    case "xml:space":
      return XML_NAMESPACE;
    case "xmlns":
    case "xmlns:xlink":
      return XMLNS_NAMESPACE;
    default:
      return null;
  }
}

export const DOM = new AbstractDOM();
