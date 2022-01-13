// import type { AnyNode } from "./simplest-dom";
import type * as minimal from "@domtree/minimal";
import { mutable } from "../../strippable/minimal";
import type { AttributeValue, AttrType } from "../buffer/attribute";
import type { ElementHeadBuffer } from "../buffer/body";
import {
  ContentBuffer,
  ElementBody,
  ElementBodyBuffer,
  HtmlBuffer,
} from "../buffer/body";
import type { ContentCursor } from "./cursor";
import type { ContentRange } from "./compatible-dom";
import {
  ATTRIBUTE_MARKER,
  CHARACTER_DATA_MARKER,
  CONTENT_RANGE_MARKER,
  ELEMENT_MARKER,
} from "./marker";
import { Dehydrated, Tokens } from "./token";

export type ContentOperationOptions = {
  readonly token: true;
};

export const ContentOperationOptions = {
  requestedToken(options: ContentOperationOptions | undefined): boolean {
    return options === undefined ? false : options.token;
  },
} as const;

export const TOKEN: ContentOperationOptions = { token: true };

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

  attr(
    qualifiedName: string,
    attrValue: string | null | AttributeValue,
    options: ContentOperationOptions
  ): Dehydrated<minimal.Attr>;
  attr(qualifiedName: string, attrValue: string | null | AttributeValue): void;
  attr(
    qualifiedName: string,
    attrValue: string | null | AttributeValue,
    options?: ContentOperationOptions
  ): Dehydrated | void {
    this.#buffer.attr(qualifiedName, attrValue);

    if (ContentOperationOptions.requestedToken(options)) {
      return this.#tokens.mark(
        this.#buffer,
        ATTRIBUTE_MARKER.forName(qualifiedName)
      );
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

  fragment(
    contents: (buffer: ContentConstructor<B>) => void
  ): Dehydrated<ContentRange> {
    return this.#tokens.mark(this.#buffer, CONTENT_RANGE_MARKER, (buffer) => {
      contents(ContentConstructor.create(this.#tokens, buffer));
      return buffer;
    }) as Dehydrated<ContentRange>;
  }

  text(
    data: string,
    options: ContentOperationOptions
  ): Dehydrated<minimal.Text>;
  text(data: string): void;
  text(
    data: string,
    options?: ContentOperationOptions
  ): void | Dehydrated<minimal.Text> {
    return this.#data((b) => b.text(data), options);
  }

  comment(
    data: string,
    options: ContentOperationOptions
  ): Dehydrated<minimal.Comment>;
  comment(data: string): void;
  comment(
    data: string,
    options?: ContentOperationOptions
  ): void | Dehydrated<minimal.Comment> {
    return this.#data((b) => b.comment(data), options);
  }

  element<T>(tag: string, construct: (head: ElementHeadConstructor) => T): T;
  element<T, U>(
    tag: string,
    construct: (head: ElementHeadConstructor) => T,
    token: (token: Dehydrated<minimal.Element>, result: T) => U
  ): U;
  element<T, U>(
    tag: string,
    construct: (head: ElementHeadConstructor) => T,
    withToken?: (token: Dehydrated<minimal.Element>, result: T) => U
  ): T | U {
    let returnValue: T | U | undefined = undefined;

    this.#buffer.element(tag, (buffer) => {
      let head = ElementHeadConstructor.create(this.#tokens, buffer);

      if (withToken) {
        let token = this.#tokens.mark(buffer, ELEMENT_MARKER);

        let body = construct(head);
        returnValue = withToken(token, body) as U;
      } else {
        returnValue = construct(head) as T;
      }
    });

    return returnValue as unknown as T | U;
  }

  #data<N extends minimal.CharacterData>(
    operation: <B extends ContentBuffer>(buffer: B) => B,
    options: ContentOperationOptions | undefined
  ): void | Dehydrated<N> {
    if (ContentOperationOptions.requestedToken(options)) {
      return this.#tokens.mark(
        this.#buffer,
        CHARACTER_DATA_MARKER,
        operation
      ) as Dehydrated<N>;
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

  insertAt(cursor: ContentCursor): void {
    cursor.insertHTML(this.#buffer.serialize());
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
  attr(construct: ConstructAttr, token: ContentOperationOptions): Dehydrated;
  attr(
    construct: ConstructAttr,
    token?: ContentOperationOptions
  ): Dehydrated | void {
    this.#buffer.attr(construct.name, construct.value);

    if (ContentOperationOptions.requestedToken(token)) {
      return this.#tokens.mark(
        this.#buffer,
        ATTRIBUTE_MARKER.forName(construct.name)
      );
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
