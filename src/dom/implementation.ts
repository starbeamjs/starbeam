import type {
  AttrNamespace,
  SimpleComment,
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from "@simple-dom/interface";
import { Profile } from "../universe";
import { exhaustive } from "../utils";
import { AttrCursor, ChildNodeCursor } from "./cursor";
import {
  AnyAttributeName,
  ForeignPrefix,
  parseAttribute,
} from "./tree-construction";
import type { DomTypes } from "./types";

export interface DomImplementation<T extends DomTypes> {
  /*
   * This really should take a ParentNode, which is Element | Fragment | Document
   * (?), but for now, it's just an element.
   */
  createAppendingCursor(
    parentNode: T["element"],
    nextSibling: T["node"]
  ): ChildNodeCursor<T>;
  createAttributeCursor(parentNode: T["element"]): AttrCursor<T>;
  createTextNode(value: string): T["text"];
  createCommentNode(value: string): T["comment"];
  insertChild(
    child: T["node"],
    parent: T["element"],
    nextSibling: T["node"]
  ): void;
  createElement(tagName: string): T["element"];
  initializeAttribute(
    parent: T["element"],
    name: AnyAttributeName,
    value: string | null
  ): T["attribute"];

  createUpdatingCursor(
    parentNode: T["element"],
    nextSibling: T["node"]
  ): ChildNodeCursor<T>;
  updateTextNode(node: T["text"], value: string): void;
  updateCommentNode(node: T["comment"], value: string): void;
  updateAttribute(
    attribute: T["attribute"],
    value: string,
    // In development mode, this extra parameter allows us to assert if
    // something unexpected happened. Passing `null` here means that the
    // attribute previously didn't exist (i.e. had a "null value").
    lastValue?: string | null
  ): void;
  removeAttribute(
    attribute: T["attribute"],
    // In development mode, this extra parameter allows us to assert if
    // something unexpected happened. Passing `null` here means that the
    // attribute previously didn't exist (i.e. had a "null value").
    lastValue?: string | null
  ): void;
}

export interface RenderedAttribute {
  parent: SimpleElement;
  name: AnyAttributeName;
}

export interface SimpleDomTypes {
  document: SimpleDocument;
  fragment: SimpleDocumentFragment;
  node: SimpleNode;
  text: SimpleText;
  comment: SimpleComment;
  element: SimpleElement;
  attribute: RenderedAttribute;
}

export class SimpleDomImplementation
  implements DomImplementation<SimpleDomTypes>
{
  static debug(document: SimpleDocument): SimpleDomImplementation {
    return new SimpleDomImplementation(document, Profile.Debug);
  }

  static production(document: SimpleDocument): SimpleDomImplementation {
    return new SimpleDomImplementation(document, Profile.Production);
  }

  #document: SimpleDocument;
  #profile: Profile;

  constructor(document: SimpleDocument, profile: Profile) {
    this.#document = document;
    this.#profile = profile;
  }

  createAttributeCursor(parentNode: SimpleElement): AttrCursor<SimpleDomTypes> {
    return new AttrCursor(parentNode, this);
  }

  createUpdatingCursor(
    parentNode: SimpleElement,
    nextSibling: SimpleNode
  ): ChildNodeCursor<SimpleDomTypes> {
    return ChildNodeCursor.inserting(parentNode, nextSibling, this);
  }

  createAppendingCursor(
    parentNode: SimpleElement
  ): ChildNodeCursor<SimpleDomTypes> {
    return ChildNodeCursor.appending(parentNode, this);
  }

  createTextNode(value: string): SimpleText {
    return this.#document.createTextNode(value);
  }

  createCommentNode(value: string): SimpleComment {
    return this.#document.createComment(value);
  }

  updateTextNode(node: SimpleText, value: string): void {
    node.nodeValue = value;
  }

  updateCommentNode(node: SimpleComment, value: string): void {
    node.nodeValue = value;
  }

  insertChild(
    child: SimpleNode,
    parent: SimpleElement,
    nextSibling: SimpleNode | null
  ): void {
    parent.insertBefore(child, nextSibling);
  }

  /* This API currently doesn't support SVG. In order to support SVG, we need a
   * DOM Tree Builder (a la DOMChangeList) that keeps the current parent node as
   * state, and uses the [HTML5 parsing algorithm] to determine what namespace
   * the element should be in (as well as making any adjustments to the element
   * name that are necessary for `createElement`).
   *
   * [html5 parsing algorithm]:
   * https://html.spec.whatwg.org/multipage/parsing.html#insert-an-html-element
   */
  createElement(tagName: string): SimpleElement {
    return this.#document.createElement(tagName);
  }

  initializeAttribute(
    parent: SimpleElement,
    name: AnyAttributeName,
    value: string | null
  ): RenderedAttribute {
    if (this.#profile === Profile.Debug) {
      let currentValue = getAttribute(parent, name);
      console.assert(
        currentValue === null,
        `Unexpectedly initializing an attribute that was already initialized.\n%o\nattribute name: %o\n       current value: %s\n`,
        parent,
        name,
        currentValue
      );
    }

    if (value !== null) {
      setAttribute(parent, name, value);
    }

    return { parent, name };
  }

  updateAttribute(
    attribute: RenderedAttribute,
    value: string,
    lastValue?: string
  ): void {
    if (this.#profile === Profile.Debug) {
      assertAttributeValue(attribute.parent, attribute.name, lastValue);
    }

    setAttribute(attribute.parent, attribute.name, value);
  }

  removeAttribute(
    { parent, name }: RenderedAttribute,
    lastValue?: string
  ): void {
    if (this.#profile === Profile.Debug) {
      let currentValue = getAttribute(parent, name);
      console.assert(
        currentValue !== null,
        `Unexpectedly removing an attribute that wasn't present.\n%o\nattribute name: %o\n      expected value: %s\n`,
        parent,
        name,
        lastValue
      );
    }

    removeAttribute(parent, name);
  }
}

function getAttribute(
  element: SimpleElement,
  attr: AnyAttributeName
): string | null {
  let { prefix, name } = parseAttribute(attr);

  if (prefix) {
    return element.getAttributeNS(namespace(prefix), name);
  } else {
    return element.getAttribute(name);
  }
}

function setAttribute(
  element: SimpleElement,
  attr: AnyAttributeName,
  value: string
) {
  let { prefix, name } = parseAttribute(attr);

  if (prefix) {
    element.setAttributeNS(namespace(prefix), name, value);
  } else {
    element.setAttribute(name, value);
  }
}

function removeAttribute(element: SimpleElement, attr: AnyAttributeName) {
  let { prefix, name } = parseAttribute(attr);

  if (prefix) {
    element.removeAttributeNS(namespace(prefix), name);
  } else {
    element.removeAttribute(name);
  }
}

function assertAttributeValue(
  parent: SimpleElement,
  name: AnyAttributeName,
  lastValue?: string | null
) {
  if (lastValue === undefined) {
    return;
  }

  let currentValue = getAttribute(parent, name);

  console.assert(
    currentValue === lastValue,
    "Unexpected change to atttribute value.\n%o\nattribute name: %o\n       expected value: %s\n       current value: %s\n",
    parent,
    name,
    lastValue,
    currentValue
  );
}

function namespace(prefix?: ForeignPrefix): AttrNamespace {
  switch (prefix) {
    case "xlink":
      return "http://www.w3.org/1999/xlink" as AttrNamespace;
    case "xml":
      return "http://www.w3.org/XML/1998/namespace" as AttrNamespace;
    case "xmlns":
      return "http://www.w3.org/2000/xmlns/" as AttrNamespace;
    case undefined:
      return "http://www.w3.org/1999/xhtml" as AttrNamespace;
    default:
      exhaustive(prefix, "Prefix");
  }
}
