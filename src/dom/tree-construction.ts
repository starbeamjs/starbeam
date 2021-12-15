import type {
  SimpleDocument,
  SimpleDocumentFragment,
  SimpleElement,
} from "@simple-dom/interface";
import type { SimpleDomTypes } from "./implementation";
import type {
  Attributes,
  TokenizedAttributes,
} from "./tree-construction/attributes";
import type { TreeContext } from "./tree-construction/insertion";
import type { DomTypes } from "./types";

// A `TokenizedTagName` is always lowercase
export type TokenizedTagName = string;

// A `NormalizedTagName` has uppercase letters when the HTML spec says it should (i.e. foreignObject)
export type NormalizedTagName = string;

// https://html.spec.whatwg.org/multipage/parsing.html#insert-a-foreign-element
//
// These prefixes require special handling in setAttributeNS
export type ForeignPrefix = "xlink" | "xml" | "xmlns";

const FOREIGN_PREFIXES = new Set(["xlink", "xml", "xmlns"]);

export function isForeignPrefix(prefix: string): prefix is ForeignPrefix {
  return FOREIGN_PREFIXES.has(prefix);
}

export type AttributeName<
  P extends ForeignPrefix | undefined,
  Name extends string
> = P extends undefined ? Name : `${ForeignPrefix}:${Name}`;

export type AnyAttributeName = AttributeName<ForeignPrefix | undefined, string>;

export function parseAttribute(name: AnyAttributeName): {
  prefix?: ForeignPrefix;
  name: string;
} {
  let [first, ...rest] = name.split(":");

  if (rest.length === 0) {
    return { name: first };
  } else if (isForeignPrefix(first)) {
    return { prefix: first, name: rest.join(":") };
  } else {
    return { name: [first, ...rest].join(":") };
  }
}

export interface ContentKind {
  readonly name: string;
  normalizeTag(tag: TokenizedTagName): NormalizedTagName;
  normalizeAttributes(attributes: TokenizedAttributes): Attributes;
}

export function ContentKind<S extends string>(
  name: S,
  definition: Omit<ContentKind, "name">
): ContentKind & { readonly name: S } {
  return {
    name,
    ...definition,
  };
}

export interface InsertionMode {
  readonly name: string;
  start: (tag: NormalizedTagName) => InsertionMode;
  normalizeTag: (tag: TokenizedTagName) => NormalizedTagName;
  normalizeAttributes: (attributes: TokenizedAttributes) => Attributes;
}

export function InsertionMode<S extends string>(
  name: S,
  options: Omit<InsertionMode, "name">
): InsertionMode & { readonly name: S } {
  return {
    name,
    ...options,
  };
}

export function HtmlInsertionMode<S extends string>(
  name: S,
  start: (tag: NormalizedTagName) => InsertionMode
): InsertionMode & { readonly name: S } {
  return {
    name,
    start,
    normalizeTag: (tag) => tag,
    normalizeAttributes: (attributes) => attributes.adjust(),
  };
}

export interface DomTreeConstructor<T extends DomTypes> {
  text(data: string): this;
  comment(data: string): this;
  element(
    tag: string,
    attributes: TokenizedAttributes,
    build: DomTreeConstructor<T>
  ): this;
}

export class SimpleDomTreeConstructor
  implements DomTreeConstructor<SimpleDomTypes>
{
  #document: SimpleDocument;
  #parent: SimpleDocumentFragment | SimpleElement;
  // @ts-expect-error
  readonly #context: TreeContext[];

  private constructor(
    document: SimpleDocument,
    parent: SimpleDocumentFragment | SimpleElement,
    context: TreeContext
  ) {
    this.#document = document;
    this.#parent = parent;
    this.#context = [context];
  }

  text(data: string): this {
    this.#parent.appendChild(this.#document.createTextNode(data));
    return this;
  }

  comment(data: string): this {
    this.#parent.appendChild(this.#document.createComment(data));
    return this;
  }

  element(
    _tag: string,
    _attributes: TokenizedAttributes,
    _build: DomTreeConstructor<SimpleDomTypes>
  ): this {
    throw Error("todo: SimpleDOMTreeConstructor#element");
  }
}
