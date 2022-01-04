// import type { AnyNode } from "./simplest-dom";
import type * as minimal from "@domtree/minimal";
import type { Hydrated } from "../../program-node/hydrator/hydrated";
import { mutable } from "../../strippable/minimal";
import {
  ContentBuffer,
  ElementBody,
  ElementBodyBuffer,
  HtmlBuffer,
} from "../cursor/append";
import {
  AttributeValue,
  AttrType,
  ElementHeadBuffer,
} from "../cursor/attribute";
import type * as dom from "./compatible-dom";
import { COMPATIBLE_DOM } from "./compatible-dom";
import {
  ATTRIBUTE_MARKER,
  BodyTransform,
  CHARACTER_DATA_MARKER,
  ContentMarker,
  ELEMENT_MARKER,
} from "./marker";
import { DehydratedToken, markedToken, Token, tokenId } from "./token";

export type ContentOperationOptions = {
  readonly token: true;
};

export const ContentOperationOptions = {
  requestedToken(options: ContentOperationOptions | undefined): boolean {
    return options === undefined ? false : options.token;
  },
} as const;

export const TOKEN: ContentOperationOptions = { token: true };

export interface ContentOperation {
  readonly append: BodyTransform;
  readonly marker: ContentMarker;
}

class Tokens {
  static create(): Tokens {
    return new Tokens(0);
  }

  #id: number;

  private constructor(id: number) {
    this.#id = id;
  }

  nextToken(): Token {
    return Token.of(String(this.#id++));
  }
}

export interface BuildElement {
  head: (buffer: HeadConstructor) => void;
  body: (buffer: TreeConstructor) => void;
}

export class ElementHeadConstructor {
  static create(
    tokens: Tokens,
    buffer: ElementHeadBuffer
  ): ElementHeadConstructor {
    return new ElementHeadConstructor(tokens, buffer);
  }

  readonly #tokens: Tokens;
  readonly #buffer: ElementHeadBuffer;

  constructor(tokens: Tokens, buffer: ElementHeadBuffer) {
    this.#tokens = tokens;
    this.#buffer = buffer;
  }

  mark(): Token {
    let token = this.#tokens.nextToken();
    ELEMENT_MARKER.mark(this.#buffer, token);
    return token;
  }

  attr(
    qualifiedName: string,
    attrValue: string | null | AttributeValue,
    options: ContentOperationOptions
  ): DehydratedToken;
  attr(qualifiedName: string, attrValue: string | null | AttributeValue): void;
  attr(
    qualifiedName: string,
    attrValue: string | null | AttributeValue,
    options?: ContentOperationOptions
  ): DehydratedToken | void {
    this.#buffer.attr(qualifiedName, attrValue);

    if (ContentOperationOptions.requestedToken(options)) {
      let token = this.#tokens.nextToken();
      ATTRIBUTE_MARKER.mark(this.#buffer, token, qualifiedName);
      return markedToken(token, ATTRIBUTE_MARKER);
    }
  }

  body(): ElementBodyConstructor;
  body(construct: (body: ElementBodyConstructor) => void): void;
  body(
    construct?: (body: ElementBodyConstructor) => void
  ): ElementBodyConstructor | void {
    let body = ContentConstructor.create(this.#tokens, this.#buffer.body());

    return construct ? construct(body) : body;
  }

  empty(type: ElementBody = "normal"): void {
    return this.#buffer.empty(type);
  }
}

export const ElementBodyConstructor = {
  flush(content: ElementBodyConstructor): void {
    return ElementBodyBuffer.flush(ContentConstructor.finalize(content));
  },
} as const;

export class ContentConstructor<B extends ContentBuffer = ContentBuffer> {
  static create<B extends ContentBuffer>(
    tokens: Tokens,
    buffer: B
  ): ContentConstructor<B> {
    return new ContentConstructor(tokens, buffer);
  }

  static finalize<B extends ContentBuffer>(content: ContentConstructor<B>): B {
    return content.#buffer;
  }

  readonly #tokens: Tokens;
  readonly #buffer: B;

  constructor(tokens: Tokens, buffer: B) {
    this.#tokens = tokens;
    this.#buffer = buffer;
  }

  text(data: string, options: ContentOperationOptions): DehydratedToken;
  text(data: string): void;
  text(
    data: string,
    options?: ContentOperationOptions
  ): void | DehydratedToken {
    return this.#append((b) => b.text(data), options);
  }

  comment(data: string, options: ContentOperationOptions): DehydratedToken;
  comment(data: string): void;
  comment(
    data: string,
    options?: ContentOperationOptions
  ): void | DehydratedToken {
    return this.#append((b) => b.comment(data), options);
  }

  element(tag: string, head: (head: ElementHeadConstructor) => void): void;
  element<T, U>(
    tag: string,
    head: (head: ElementHeadConstructor) => T,
    token: (token: DehydratedToken, result: T) => U
  ): U;
  element<T, U>(
    tag: string,
    construct: (head: ElementHeadConstructor) => T,
    withToken?: (token: DehydratedToken, result: T) => U
  ): U | void {
    let returnValue: U | undefined = undefined;

    this.#buffer.element(tag, (buffer) => {
      let head = ElementHeadConstructor.create(this.#tokens, buffer);

      if (withToken) {
        let token = head.mark();
        let result = construct(head);
        let dehydratedToken = markedToken(token, ELEMENT_MARKER);
        returnValue = withToken(dehydratedToken, result);
      } else {
        construct(head);
      }
    });

    return returnValue;
  }

  #append(
    operation: <B extends ContentBuffer>(buffer: B) => B,
    options: ContentOperationOptions | undefined
  ): void | DehydratedToken {
    if (ContentOperationOptions.requestedToken(options)) {
      let token = this.#tokens.nextToken();
      CHARACTER_DATA_MARKER.mark(this.#buffer, token, operation);
      return markedToken(token, CHARACTER_DATA_MARKER);
    } else {
      operation(this.#buffer);
    }
  }
}

export type ElementBodyConstructor = ContentConstructor<ElementBodyBuffer>;

/**
 * `TreeConstructor` builds up a valid string of HTML, which it then gives to the browsers'
 */
export class TreeConstructor extends ContentConstructor<HtmlBuffer> {
  static html(): TreeConstructor {
    return new TreeConstructor(HtmlBuffer.create(), Tokens.create());
  }

  readonly #buffer: HtmlBuffer;

  private constructor(buffer: HtmlBuffer, tokens: Tokens) {
    super(tokens, buffer);
    this.#buffer = buffer;
  }

  replace(placeholder: minimal.TemplateElement): void {
    mutable(placeholder).outerHTML = this.#buffer.serialize();
  }
}

export interface ConstructAttr {
  /**
   * Qualified Name
   */
  name: string;
  value: string | null;
  type?: AttrType;
}

export class HeadConstructor {
  static of(buffer: ElementHeadBuffer, tokens: Tokens): HeadConstructor {
    return new HeadConstructor(buffer, tokens);
  }

  readonly #buffer: ElementHeadBuffer;
  readonly #tokens: Tokens;

  private constructor(buffer: ElementHeadBuffer, tokens: Tokens) {
    this.#buffer = buffer;
    this.#tokens = tokens;
  }

  attr(construct: ConstructAttr): void;
  attr(
    construct: ConstructAttr,
    token: ContentOperationOptions
  ): DehydratedToken;
  attr(
    construct: ConstructAttr,
    token?: ContentOperationOptions
  ): DehydratedToken | void {
    this.#buffer.attr(construct.name, construct.value);

    if (ContentOperationOptions.requestedToken(token)) {
      let token = this.#tokens.nextToken();
      ATTRIBUTE_MARKER.mark(this.#buffer, token, construct.name);
      return markedToken(token, ATTRIBUTE_MARKER);
    }
  }
}

export type Range =
  | {
      type: "range";
      start: minimal.Node;
      end: minimal.Node;
    }
  | {
      type: "node";
      node: minimal.Node;
    };

export type HydratedTokens = ReadonlyMap<Token, Hydrated>;

export class TreeHydrator {
  static hydrate(
    document: dom.CompatibleDocument,
    fragment: dom.CompatibleDocumentFragment,
    tokens: Set<Token>
  ): HydratedTokens {
    let tokenMap = new Map<string, Token>();

    for (let token of tokens) {
      tokenMap.set(tokenId(token), token);
    }

    return new TreeHydrator(
      document as minimal.Document,
      fragment as minimal.DocumentFragment,
      tokenMap
    ).#hydrate();
  }

  readonly #document: minimal.Document;
  readonly #fragment: minimal.DocumentFragment;
  readonly #tokens: Map<string, Token>;

  constructor(
    document: minimal.Document,
    fragment: minimal.DocumentFragment,
    tokens: Map<string, Token>
  ) {
    this.#document = document;
    this.#fragment = fragment;
    this.#tokens = tokens;
  }

  #hydrate(): HydratedTokens {
    let nodes = COMPATIBLE_DOM.findAll(this.#fragment, {
      attributes: {
        any: ["data-starbeam-marker:attrs", "data-starbeam-marker"],
      },
    });

    let hydrated = new Map<Token, Hydrated>();
    let tokens = this.#tokens;

    if (nodes) {
      for (let element of nodes) {
        let attrMarker = COMPATIBLE_DOM.getAttr(
          element,
          "data-starbeam-marker:attrs"
        );

        let contentMarker = COMPATIBLE_DOM.getAttr(
          element,
          "data-starbeam-marker:contents"
        );

        if (contentMarker) {
          let tokenId = contentMarker.value;

          if (tokens.has(tokenId)) {
            if (!isTemplateElement(element)) {
              throw Error(
                "Unexpected: an element with data-starbeam-marker:contents was unexpectedly not a template. This is a bug."
              );
            }

            let contents = COMPATIBLE_DOM.getTemplateContents(element);
            let body = hydrateTemplate(this.#document, element, contents);

            hydrated.set(Token.of(tokenId), body);
          }
        }

        if (attrMarker) {
          throw Error("todo: TreeHydrator attributes");
        }
      }
    }

    return hydrated;
  }
}

function isTemplateElement(
  element: minimal.Element
): element is minimal.TemplateElement {
  return element.tagName === "TEMPLATE";
}

function hydrateTemplate(
  document: minimal.Document,
  template: minimal.TemplateElement,
  fragment: minimal.DocumentFragment
): Hydrated {
  let { firstChild, lastChild } = fragment;

  if (firstChild === null) {
    let comment = document.createComment(`<!-- empty -->`);
    COMPATIBLE_DOM.replace(template, comment);

    return { type: "node", node: comment as minimal.Comment };
  }

  COMPATIBLE_DOM.replace(template, fragment);

  if (firstChild === lastChild) {
    return { type: "node", node: firstChild as minimal.Node };
  } else {
    return {
      type: "range",
      range: [firstChild as minimal.Node, lastChild as minimal.Node],
    };
  }
}
