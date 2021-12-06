import { ChildNodeCursor } from "./cursor";

import {
  SimpleDocument,
  SimpleNode,
  SimpleElement,
  SimpleText,
} from "@simple-dom/interface";
import * as simple from "@simple-dom/interface";
import { AttrNamespace } from "./fundamentals";
import { Profile } from "../timeline/index";

export interface DomTypes {
  document: unknown;
  node: unknown;
  text: unknown;
  element: unknown;
}

export type DomType<T extends DomTypes> = T[keyof T];

export interface DomImplementation<T extends DomTypes> {
  /*
   * This really should take a ParentNode, which is Element | Fragment | Document
   * (?), but for now, it's just an element.
   */
  createAppendingCursor(
    parentNode: T["element"],
    nextSibling: T["node"]
  ): ChildNodeCursor<T>;
  createTextNode(value: string): T["text"];
  insertChild(
    child: T["node"],
    parent: T["element"],
    nextSibling: T["node"]
  ): void;
  createElement(tagName: string): T["element"];
  initializeAttribute(
    parent: T["element"],
    name: [string, string | null],
    value: string
  ): void;

  createUpdatingCursor(
    parentNode: T["element"],
    nextSibling: T["node"]
  ): ChildNodeCursor<T>;
  updateTextNode(node: T["text"], value: string): void;
  updateAttribute(
    parent: T["element"],
    name: [string, string | null],
    value: string,
    // In development mode, this extra parameter allows us to assert if
    // something unexpected happened. Passing `null` here means that the
    // attribute previously didn't exist (i.e. had a "null value").
    lastValue?: string | null
  ): void;
  removeAttribute(
    parent: T["element"],
    name: [string, string | null],
    // In development mode, this extra parameter allows us to assert if
    // something unexpected happened. Passing `null` here means that the
    // attribute previously didn't exist (i.e. had a "null value").
    lastValue?: string | null
  ): void;
}

export interface SimpleDomTypes {
  document: SimpleDocument;
  node: SimpleNode;
  text: SimpleText;
  element: SimpleElement;
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

  updateTextNode(node: SimpleText, value: string): void {
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
    name: [string, string | null],
    value: string
  ): void {
    if (this.#profile === Profile.Debug) {
      let currentValue = getAttribute(parent, name);
      console.assert(
        currentValue === null,
        `Unexpectedly initializing an attribute that was already initialized.\n%o\nattribute name: %o\n       current value: %s\n`,
        parent,
        formatAttr(name),
        currentValue
      );
    }

    setAttribute(parent, name, value);
  }

  updateAttribute(
    parent: SimpleElement,
    name: [string, AttrNamespace | null],
    value: string,
    lastValue?: string
  ): void {
    if (this.#profile === Profile.Debug) {
      assertAttributeValue(parent, name, lastValue);
    }

    setAttribute(parent, name, value);
  }

  removeAttribute(
    parent: SimpleElement,
    name: [string, AttrNamespace | null],
    lastValue?: string
  ): void {
    if (this.#profile === Profile.Debug) {
      let currentValue = getAttribute(parent, name);
      console.assert(
        currentValue !== null,
        `Unexpectedly removing an attribute that wasn't present.\n%o\nattribute name: %o\n      expected value: %s\n`,
        parent,
        formatAttr(name),
        lastValue
      );
    }

    removeAttribute(parent, name);
  }
}

function getAttribute(
  element: SimpleElement,
  [name, ns]: [string, string | null]
): string | null {
  if (ns !== null) {
    return element.getAttribute(name);
  } else {
    return element.getAttributeNS(ns, name);
  }
}

function setAttribute(
  element: SimpleElement,
  [name, ns]: [string, string | null],
  value: string
) {
  if (ns === null) {
    element.setAttribute(name, value);
  } else {
    element.setAttributeNS(ns as simple.AttrNamespace, name, value);
  }
}

function removeAttribute(
  element: SimpleElement,
  [name, ns]: [string, string | null]
) {
  if (ns === null) {
    element.removeAttribute(name);
  } else {
    element.removeAttributeNS(ns as simple.AttrNamespace, name);
  }
}

function assertAttributeValue(
  parent: SimpleElement,
  name: [string, string | null],
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
    formatAttr(name),
    lastValue,
    currentValue
  );
}

function formatAttr([name, ns]: [string, string | null]): string {
  switch (ns) {
    case "http://www.w3.org/1999/xlink":
      return `xlink:${name}`;
    case "http://www.w3.org/XML/1998/namespace":
      return `xml:${name}`;
    case "http://www.w3.org/2000/xmlns/":
      return `xmlns:${name}`;
    case null:
      return name;
    default:
      throw Error(`Invalid attribute namespace ${ns}`);
  }
}
