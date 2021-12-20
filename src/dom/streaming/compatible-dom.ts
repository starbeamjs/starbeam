import type * as browser from "@domtree/browser";
import type * as minimal from "@domtree/minimal";
import type { Mutable } from "@domtree/minimal";
import type * as simple from "@domtree/simple";
import { exhaustive } from "../..";
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

export type CompatibleNode = CompatibleCharacterData;

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

export interface Cursor {
  parent: minimal.ParentNode;
  next: minimal.Node | null;
}

export class AbstractDOM {
  getNodeType(node: CompatibleNode): number {
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

    (element as Mutable<minimal.Element>).setAttributeNS(
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

  insert(
    node: CompatibleChildNode | CompatibleDocumentFragment,
    { parent, next }: Cursor
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

  remove(child: CompatibleChildNode): Cursor | null {
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

export const COMPATIBLE_DOM = new AbstractDOM();

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
