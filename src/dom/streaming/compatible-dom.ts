import type * as dom from "@domtree/any";
import type * as browser from "@domtree/browser";
// eslint-disable-next-line import/no-duplicates
import type * as minimal from "@domtree/minimal";
// eslint-disable-next-line import/no-duplicates
import type { Mutable } from "@domtree/minimal";
import { exhaustive, verified, verify } from "../../strippable/assert.js";
import { is, minimize, mutable } from "../../strippable/minimal.js";
import { tap } from "../../utils.js";
import type { DomEnvironment } from "../environment.js";
import { ContentCursor, RangeSnapshot } from "./cursor.js";
import {
  HTML_NAMESPACE,
  MATHML_NAMESPACE,
  SVG_NAMESPACE,
  XLINK_NAMESPACE,
  XMLNS_NAMESPACE,
  XML_NAMESPACE,
} from "./namespaces.js";

type RangeNodes = readonly [first: minimal.ChildNode, last?: minimal.ChildNode];

export const RangeNodes = {
  asSingle(nodes: RangeNodes): minimal.ChildNode | null {
    let [first, last] = nodes;

    if (last === undefined || first === last) {
      return first;
    } else {
      return null;
    }
  },
};

export abstract class ContentRange {
  static from(...[first, last]: RangeNodes): ContentRange {
    if (last && first !== last) {
      return ContentRangeNodes.create(first, last);
    } else {
      return ContentRangeNode.create(first);
    }
  }

  static empty(comment: minimal.Comment): ContentRange {
    return EmptyContentRange.of(comment);
  }

  abstract toContentRange(): RangeNodes;

  mutate(environment: DomEnvironment): MutateContentRange {
    return MutateContentRange.create(
      MinimalDocumentUtilities.of(environment),
      this.start,
      this.end
    );
  }

  snapshot(environment: DomEnvironment): RangeSnapshot {
    let [start, end] = this.toContentRange();

    return RangeSnapshot.create(environment, start, end);
  }

  asNode(): minimal.ChildNode | null {
    let [start, end] = this.toContentRange();

    if (end === undefined || start === end) {
      return start;
    } else {
      return null;
    }
  }

  toStaticRange(): minimal.StaticRange {
    let [start, end] = this.toContentRange();

    return new global.StaticRange({
      startContainer: start as browser.ChildNode,
      endContainer: (end ?? start) as browser.ChildNode,
      startOffset: 0,
      endOffset: 0,
    }) as minimal.StaticRange;
  }

  get start(): minimal.ChildNode {
    return this.toContentRange()[0];
  }

  get end(): minimal.ChildNode {
    let [start, end] = this.toContentRange();

    return end ?? start;
  }

  get before(): ContentCursor {
    let end = this.end;
    return ContentCursor.create(
      verified(end.parentNode, is.Present),
      end.nextSibling
    );
  }

  get after(): ContentCursor {
    let start = this.start;
    return ContentCursor.create(verified(start.parentNode, is.Present), start);
  }
}

export class MutateContentRange {
  static create(
    minimal: MinimalDocumentUtilities,
    start: minimal.ChildNode,
    end: minimal.ChildNode
  ): MutateContentRange {
    return new MutateContentRange(minimal, start, end);
  }

  readonly #minimal: MinimalDocumentUtilities;
  readonly #start: minimal.ChildNode;
  readonly #end: minimal.ChildNode;

  private constructor(
    minimal: MinimalDocumentUtilities,
    start: minimal.ChildNode,
    end: minimal.ChildNode
  ) {
    this.#minimal = minimal;
    this.#start = start;
    this.#end = end;
  }

  toLiveRange(): minimal.LiveRange {
    return this.#minimal.rangeAround(this.#start, this.#end);
  }

  remove(): ContentCursor {
    return tap(
      ContentCursor.create(
        verified(this.#start.parentNode, is.Present),
        this.#start.nextSibling
      ),
      () => this.toLiveRange().deleteContents()
    );
  }
}

export class ContentRangeNodes extends ContentRange {
  static create(
    first: minimal.ChildNode,
    last: minimal.ChildNode
  ): ContentRange {
    return new ContentRangeNodes([first, last]);
  }

  readonly type = "nodes";
  readonly #nodes: RangeNodes;

  private constructor(nodes: RangeNodes) {
    super();
    this.#nodes = nodes;
  }

  toContentRange(): RangeNodes {
    return this.#nodes;
  }
}

export class ContentRangeNode extends ContentRange {
  static is(range: ContentRange): range is ContentRangeNode {
    return range instanceof ContentRangeNode;
  }

  static create(node: minimal.ChildNode): ContentRangeNode {
    return new ContentRangeNode(node);
  }

  protected constructor(readonly node: minimal.ChildNode) {
    super();
  }

  toContentRange(): RangeNodes {
    return [this.node];
  }
}

export class EmptyContentRange extends ContentRangeNode {
  static of(comment: minimal.Comment): EmptyContentRange {
    return new EmptyContentRange(comment);
  }

  static is(range: ContentRange): range is EmptyContentRange {
    return range instanceof EmptyContentRange;
  }
}

export class AbstractDOM {
  // static of(document: DomDocument): AbstractDOM {
  //   return new AbstractDOM(MinimalUtilities.of(document));
  // }

  // readonly #minimal: MinimalUtilities;

  // private constructor(minimal: MinimalUtilities) {
  //   this.#minimal = minimal;
  // }

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
      parent as minimal.Element,
      qualifiedName,
      encoding || null
    );
    return (document as minimal.Document).createElementNS(ns, qualifiedName);
  }

  updateAttr(attr: dom.Attr, value: string | null): void {
    verify(attr, is.Attr);
    if (value === null) {
      this.removeAttr(attr);
    } else {
      mutable(attr).value = value;
    }
  }

  removeAttr(attr: dom.Attr): void {
    MINIMAL.removeAttr(verified(attr, is.Attr));
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
    return MINIMAL.getAttr(element, qualifiedName);
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

    MINIMAL.setAttr(mutable(element), qualifiedName, value);
  }

  hasAttr(element: dom.Element, qualifiedName: string): boolean {
    verify(element, is.Element);

    return MINIMAL.hasAttr(element, qualifiedName);
  }

  children(parent: dom.ParentNode): readonly minimal.ChildNode[] {
    return MINIMAL.children(parent as minimal.ParentNode);
  }

  insert(
    node: dom.ChildNode | dom.DocumentFragment,
    { parent, next }: ContentCursor
  ): void {
    MINIMAL.insert(
      node as minimal.ChildNode | minimal.DocumentFragment,
      ContentCursor.create(parent, next)
    );
  }

  replace(
    node: dom.ChildNode,
    withNode: dom.ChildNode | dom.DocumentFragment
  ): void {
    let cursor = this.remove(node);

    if (!cursor) {
      throw new Error(
        "Unexpected: replace() was called with an element that had no parent."
      );
    }

    this.insert(withNode, cursor);
  }

  appending(parent: dom.ParentNode): ContentCursor {
    return ContentCursor.create(parent as minimal.ParentNode, null);
  }

  remove(child: dom.ChildNode): ContentCursor | null {
    return MINIMAL.remove(child as minimal.ChildNode);
  }

  getTemplateContents(element: dom.TemplateElement): minimal.DocumentFragment {
    return element.content as minimal.DocumentFragment;
  }
}

export const DOM = new AbstractDOM();

export class AbstractDocumentUtilities {
  static of(utils: MinimalDocumentUtilities): AbstractDocumentUtilities {
    return new AbstractDocumentUtilities(utils);
  }

  readonly #utils: MinimalDocumentUtilities;

  private constructor(utils: MinimalDocumentUtilities) {
    this.#utils = utils;
  }
}

/**
 * The methods of this class are conveniences, and operate on minimal DOM.
 */
export class MinimalUtilities {
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
      this.removeAttr(attr);
    } else {
      mutable(attr).value = value;
    }
  }

  removeAttr(attr: Mutable<minimal.Attr>): void {
    let element = attr.ownerElement;

    if (element) {
      mutable(element).removeAttribute(this.#attrQualifiedName(attr));
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
    element: minimal.Element,
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
    element: Mutable<minimal.Element>,
    qualifiedName: string,
    value: string
  ): void {
    let ns = getAttrNS(element, qualifiedName);

    mutable(element).setAttributeNS(ns, qualifiedName, value);
  }

  hasAttr(element: minimal.Element, qualifiedName: string): boolean {
    return element.hasAttribute(qualifiedName);
  }

  replace<T>(
    child: minimal.ChildNode,
    atCursor: (cursor: ContentCursor) => T
  ): T {
    let parent = verified(child.parentNode, is.ParentNode);
    let next = child.nextSibling as minimal.ChildNode | null;

    (child as Mutable<minimal.ChildNode>).remove();

    return atCursor(ContentCursor.create(parent, next));
  }

  remove(child: minimal.ChildNode): ContentCursor | null {
    let parent = child.parentNode as minimal.ParentNode | null;
    let next = child.nextSibling as minimal.ChildNode | null;

    (child as Mutable<minimal.ChildNode>).remove();

    if (parent) {
      return ContentCursor.create(parent, next);
    } else {
      return null;
    }
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
    this.eachChild(parent, (node) => children.push(node));
    return children;
  }

  move(
    node: minimal.ChildNode | minimal.DocumentFragment,
    to: ContentCursor
  ): void {
    this.insert(node, to);
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
}

export const MINIMAL = new MinimalUtilities();

export class MinimalDocumentUtilities {
  static of(environment: DomEnvironment): MinimalDocumentUtilities {
    return new MinimalDocumentUtilities(environment);
  }

  private constructor(readonly environment: DomEnvironment) {}

  get document(): minimal.Document {
    return this.environment.document;
  }

  createPlaceholder(): minimal.ChildNode {
    return this.document.createComment("");
  }

  cursorAsRange(cursor: ContentCursor): minimal.LiveRange {
    let { parent, next } = cursor;
    if (next === null) {
      return this.rangeAppendingTo(parent);
    } else {
      return this.rangeAround(next);
    }
  }

  rangeAround(
    first: minimal.ChildNode,
    last: minimal.ChildNode = first
  ): minimal.LiveRange {
    return tap(minimize(this.environment.liveRange()), (range) => {
      range.setStartBefore(first);
      range.setEndAfter(last);
    });
  }

  rangeAppendingTo(parent: minimal.ParentNode): minimal.LiveRange {
    return tap(minimize(this.environment.liveRange()), (range) => {
      range.selectNodeContents(parent);
      range.collapse();
    });
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
