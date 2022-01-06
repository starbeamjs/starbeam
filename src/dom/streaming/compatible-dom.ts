import type * as dom from "@domtree/any";
import type * as browser from "@domtree/browser";
// eslint-disable-next-line import/no-duplicates
import type * as minimal from "@domtree/minimal";
// eslint-disable-next-line import/no-duplicates
import type { Mutable } from "@domtree/minimal";
import { assert, exhaustive, verified, verify } from "../../strippable/assert";
import { is, mutable } from "../../strippable/minimal";
import { as } from "../../strippable/verify-context";
import * as global from "../../types/global-dom";
import {
  HTML_NAMESPACE,
  MATHML_NAMESPACE,
  SVG_NAMESPACE,
  XLINK_NAMESPACE,
  XMLNS_NAMESPACE,
  XML_NAMESPACE,
} from "./namespaces";

export interface ContentCursor {
  parent: minimal.ParentNode;
  next: minimal.Node | null;
}

export function ContentCursor(
  parent: minimal.ParentNode,
  next: minimal.Node | null
): ContentCursor {
  return {
    parent,
    next,
  };
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
  getNodeType(node: dom.Node): number {
    verify(node, is.Node);
    return node.nodeType;
  }

  createText(document: dom.Document, data: string): minimal.Text {
    return (document as minimal.Document).createTextNode(data);
  }

  createComment(document: dom.Document, data: string): minimal.Comment {
    return (document as minimal.Document).createComment(data);
  }

  getData(data: dom.CharacterData): string {
    return (data as minimal.ReadonlyCharacterData).data;
  }

  setData(data: dom.CharacterData, value: string): void {
    (data as minimal.Mutable<minimal.ReadonlyCharacterData>).data = value;
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
    document: dom.Document,
    qualifiedName: string,
    {
      parent,
      encoding,
    }: {
      parent: dom.Element;
      encoding?: string;
    }
  ): minimal.ParentNode {
    let ns = getElementNS(
      parent as minimal.ParentNode,
      qualifiedName,
      encoding || null
    );
    return (document as minimal.Document).createElementNS(ns, qualifiedName);
  }

  updateAttr(attr: dom.Attr, value: string | null): void {
    verify(attr, is.Attr);
    if (value === null) {
      COMPATIBLE_DOM.removeAttr(attr);
    } else {
      mutable(attr).value = value;
    }
  }

  removeAttr(attr: dom.Attr): void {
    MINIMAL_DOM.removeAttr(verified(attr, is.Attr));
  }

  /**
   * This API assumes that a qualifiedName like `xlink:href` was created with
   * the correct namespace.
   *
   * @param element
   * @param qualifiedName
   */
  getAttr(element: dom.Element, qualifiedName: string): minimal.Attr | null {
    verify(element, is.Element);
    return MINIMAL_DOM.getAttr(element, qualifiedName);
  }

  /**
   * This API lightly normalizes [foreign attributes] according to the spec.
   * This allows setAttr and getAttr to both take a `qualifiedName`.
   *
   * [foreign attributes]:
   * https://html.spec.whatwg.org/multipage/parsing.html#adjust-foreign-attributes
   */
  setAttr(element: dom.Element, qualifiedName: string, value: string): void {
    verify(element, is.Element);

    MINIMAL_DOM.setAttr(mutable(element), qualifiedName, value);
  }

  hasAttr(element: dom.Element, qualifiedName: string): boolean {
    verify(element, is.Element);

    return MINIMAL_DOM.hasAttr(element, qualifiedName);
  }

  children(parent: dom.ParentNode): readonly minimal.ChildNode[] {
    return MINIMAL_DOM.children(parent as minimal.ParentNode);
  }

  insert(
    node: dom.ChildNode | dom.DocumentFragment,
    { parent, next }: ContentCursor
  ): void {
    MINIMAL_DOM.insert(node as minimal.ChildNode | minimal.DocumentFragment, {
      parent,
      next,
    });
  }

  replace(
    node: dom.ChildNode,
    withNode: dom.ChildNode | dom.DocumentFragment
  ): void {
    let cursor = COMPATIBLE_DOM.remove(node);

    if (!cursor) {
      throw new Error(
        "Unexpected: replace() was called with an element that had no parent."
      );
    }

    COMPATIBLE_DOM.insert(withNode, cursor);
  }

  appending(parent: dom.ParentNode): ContentCursor {
    return {
      parent: parent as minimal.ParentNode,
      next: null,
    };
  }

  cursor(parent: dom.ParentNode, next: dom.ChildNode | null): ContentCursor {
    return {
      parent: parent as minimal.ParentNode,
      next: next as minimal.ChildNode,
    };
  }

  remove(child: dom.ChildNode): ContentCursor | null {
    return MINIMAL_DOM.remove(child as minimal.ChildNode);
  }

  getTemplateContents(element: dom.TemplateElement): minimal.DocumentFragment {
    return element.content as minimal.DocumentFragment;
  }
}

/**
 * The methods of this class are conveniences, and operate on minimal DOM.
 */
export class MinimalUtilities {
  get document(): minimal.Document {
    return document as unknown as minimal.Document;
  }

  element(
    document: minimal.Document,
    parent: minimal.ParentNode,
    tag: "template"
  ): minimal.TemplateElement;
  element(
    document: minimal.Document,
    parent: minimal.ParentNode,
    tag: string
  ): minimal.ParentNode;
  element(
    document: minimal.Document,
    parent: minimal.ParentNode,
    tag: string
  ): minimal.ParentNode {
    return document.createElementNS(HTML_NAMESPACE, tag);
  }

  updateAttr(attr: Mutable<minimal.Attr>, value: string | null): void {
    if (value === null) {
      MINIMAL_DOM.removeAttr(attr);
    } else {
      mutable(attr).value = value;
    }
  }

  removeAttr(attr: Mutable<minimal.Attr>): void {
    let element = attr.ownerElement;

    if (element) {
      mutable(element).removeAttribute(MINIMAL_DOM.#attrQualifiedName(attr));
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
    element: minimal.ParentNode,
    qualifiedName: string
  ): minimal.Attr | null {
    return element.getAttributeNode(qualifiedName);
  }

  /**
   * This API lightly normalizes [foreign attributes] according to the spec.
   * This allows setAttr and getAttr to both take a `qualifiedName`.
   *
   * [foreign attributes]:
   * https://html.spec.whatwg.org/multipage/parsing.html#adjust-foreign-attributes
   */
  setAttr(
    element: Mutable<minimal.ParentNode>,
    qualifiedName: string,
    value: string
  ): void {
    let ns = getAttrNS(element, qualifiedName);

    mutable(element).setAttributeNS(ns, qualifiedName, value);
  }

  hasAttr(element: minimal.ParentNode, qualifiedName: string): boolean {
    return element.hasAttribute(qualifiedName);
  }

  replace<T>(
    child: minimal.ChildNode,
    atCursor: (cursor: ContentCursor) => T
  ): T {
    let parent = verified(child.parentNode, is.ParentNode);
    let next = child.nextSibling as minimal.Node | null;

    (child as Mutable<minimal.ChildNode>).remove();

    return atCursor({ parent, next });
  }

  remove(child: minimal.ChildNode): ContentCursor | null {
    let parent = child.parentNode as minimal.ParentNode | null;
    let next = child.nextSibling as minimal.Node | null;

    (child as Mutable<minimal.ChildNode>).remove();

    if (parent) {
      return { parent, next };
    } else {
      return null;
    }
  }

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

  eachChild(
    node: minimal.ParentNode,
    each: (node: minimal.ChildNode) => void
  ): void {
    let current = node.firstChild;

    while (current) {
      let next = current.nextSibling;
      each(current);
      current = next;
    }
  }

  children(parent: minimal.ParentNode): readonly minimal.ChildNode[] {
    let children: minimal.ChildNode[] = [];
    MINIMAL_DOM.eachChild(parent, (node) => children.push(node));
    return children;
  }

  insert(
    node: minimal.ChildNode | minimal.DocumentFragment,
    { parent, next }: ContentCursor
  ): void {
    (parent as Mutable<minimal.ParentNode>).insertBefore(
      node as minimal.ChildNode | minimal.DocumentFragment,
      next
    );
  }

  #attrQualifiedName(attr: dom.Attr): string {
    if (attr.prefix) {
      return `${attr.prefix}:${attr.localName}`;
    } else {
      return attr.localName;
    }
  }

  #cursorAfterStaticRange(staticRange: minimal.StaticRange): ContentCursor {
    let end = staticRange.endContainer;
    let parent = end.parentNode as minimal.ParentNode | null;

    verify(parent, is.Present, as(`parent of ${end}`));

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

function isHtmlElement(element: minimal.ParentNode): boolean {
  return element.namespaceURI === HTML_NAMESPACE;
}

function getElementNS(
  parent: minimal.ParentNode,
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
  element: minimal.ParentNode,
  name: string
): minimal.AttributeNamespace | null {
  if (isHtmlElement(element as minimal.ParentNode)) {
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
