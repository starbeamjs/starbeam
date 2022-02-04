// import type { AnyNode } from "./simplest-dom.js";
import type * as minimal from "@domtree/minimal";
import { verified } from "../../strippable/assert.js";
import { is, mutable } from "../../strippable/minimal.js";
import type { AttributeValue, AttrType } from "../buffer/attribute.js";
import type { ElementHeadBuffer } from "../buffer/body.js";
import {
  ContentBuffer,
  ElementBody,
  ElementBodyBuffer,
  HtmlBuffer,
} from "../buffer/body.js";
import type { DomEnvironment } from "../environment.js";
import type { ContentRange } from "./compatible-dom.js";
import type { ContentCursor } from "./cursor.js";
import {
  ATTRIBUTE_MARKER,
  CHARACTER_DATA_MARKER,
  CONTENT_RANGE_MARKER,
  ELEMENT_MARKER,
} from "./marker.js";
import type { Dehydrated, Tokens } from "./token.js";

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

  get environment(): DomEnvironment {
    return this.#tokens.environment;
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

  fragment<T>(contents: (buffer: ContentConstructor<B>) => T): {
    range: Dehydrated<ContentRange>;
    result: T;
  } {
    let result: T | undefined;

    let range = this.#tokens.mark(
      this.#buffer,
      CONTENT_RANGE_MARKER,
      (buffer) => {
        result = contents(
          ContentConstructor.create(this.#tokens, buffer as B)
        ) as T;
        return buffer;
      }
    ) as Dehydrated<ContentRange>;

    return { result: verified(result, is.Present), range };
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
  static html(environment: DomEnvironment): TreeConstructor {
    return new TreeConstructor(
      HtmlBuffer.create(),
      environment.tokens,
      environment
    );
  }

  readonly #buffer: HtmlBuffer;

  private constructor(
    buffer: HtmlBuffer,
    tokens: Tokens,
    readonly environment: DomEnvironment
  ) {
    super(tokens, buffer);
    this.#buffer = buffer;
  }

  insertAt(cursor: ContentCursor): void {
    cursor.mutate(this.environment).insertHTML(this.#buffer.serialize());
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
