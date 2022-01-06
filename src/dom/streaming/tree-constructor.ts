// import type { AnyNode } from "./simplest-dom";
import type * as minimal from "@domtree/minimal";
import { mutable } from "../../strippable/minimal";
import type {
  AttributeValue,
  AttrType,
  ElementHeadBuffer,
} from "../buffer/attribute";
import {
  ContentBuffer,
  ElementBody,
  ElementBodyBuffer,
  HtmlBuffer,
} from "../buffer/body";
import {
  ATTRIBUTE_MARKER,
  CHARACTER_DATA_MARKER,
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

  element(tag: string, head: (head: ElementHeadConstructor) => void): void;
  element<T, U>(
    tag: string,
    head: (head: ElementHeadConstructor) => T,
    token: (token: Dehydrated<minimal.Element>, result: T) => U
  ): U;
  element<T, U>(
    tag: string,
    construct: (head: ElementHeadConstructor) => T,
    withToken?: (token: Dehydrated<minimal.Element>, result: T) => U
  ): U | void {
    let returnValue: U | undefined = undefined;

    this.#buffer.element(tag, (buffer) => {
      let head = ElementHeadConstructor.create(this.#tokens, buffer);

      if (withToken) {
        let token = this.#tokens.mark(buffer, ELEMENT_MARKER);

        let body = construct(head);
        returnValue = withToken(token, body);
      } else {
        construct(head);
      }
    });

    return returnValue;
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
