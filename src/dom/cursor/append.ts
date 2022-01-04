import { ElementHeadBuffer } from "./attribute";

export interface SerializeOptions {
  prefix: string;
}

export interface Serialize {
  /**
   * The `prefix` option instructs the serializeInto function to insert a
   * prefix, but only if there is anything to serialize.
   */
  serializeInto(buffer: Buffer, options?: SerializeOptions): void;
}

export class Buffer implements Serialize {
  static empty(): Buffer {
    return new Buffer([]);
  }

  readonly #parts: string[];

  constructor(parts: string[]) {
    this.#parts = parts;
  }

  append(part: string): void {
    this.#parts.push(part);
  }

  appending<T>(
    value: T | null,
    callback: (value: T) => void,
    options: SerializeOptions | null
  ): void {
    if (value !== null) {
      let prefix = options?.prefix;
      if (prefix) {
        this.append(prefix);
      }
      callback(value);
    }
  }

  serializeInto(buffer: Buffer): void {
    for (let part of this.#parts) {
      buffer.append(part);
    }
  }

  serialize(): string {
    return this.#parts.join("");
  }
}

export interface ContentBuffer {
  text(data: string): this;
  comment(data: string): this;
  element(
    tag: string,
    build: (builder: ElementHeadBuffer) => ElementBodyBuffer | void
  ): this;
}

export interface ElementState {
  readonly tag: string;
  readonly buffer: Buffer;
}

export interface ElementBodyState extends ElementState {
  readonly content: HtmlBuffer;
}

export class ElementBodyBuffer implements ContentBuffer {
  static create(state: ElementState): ElementBodyBuffer {
    return new ElementBodyBuffer({
      ...state,
      content: HtmlBuffer.of(state.buffer),
    });
  }

  static flush(builder: ElementBodyBuffer): void {
    builder.#buffer.append(`</${builder.#tag}>`);
  }

  readonly #state: ElementBodyState;

  private constructor(state: ElementBodyState) {
    this.#state = state;
  }

  get #tag(): string {
    return this.#state.tag;
  }

  get #buffer(): Buffer {
    return this.#state.buffer;
  }

  get #content(): HtmlBuffer {
    return this.#state.content;
  }

  empty(): this {
    return this;
  }

  text(data: string): this {
    this.#content.text(data);
    return this;
  }

  comment(data: string): this {
    this.#content.comment(data);
    return this;
  }

  element(
    tag: string,
    build: (builder: ElementHeadBuffer) => ElementBodyBuffer | void
  ): this {
    this.#content.element(tag, build);
    return this;
  }
}

export type ElementBody = "normal" | "void" | "self-closing";

export interface ElementOptions {
  readonly body: ElementBody;
}

export class HtmlBuffer implements ContentBuffer {
  static create(): HtmlBuffer {
    return new HtmlBuffer(Buffer.empty());
  }

  static of(buffer: Buffer): HtmlBuffer {
    return new HtmlBuffer(buffer);
  }

  readonly #buffer: Buffer;

  private constructor(buffer: Buffer) {
    this.#buffer = buffer;
  }

  text(data: string): this {
    this.#buffer.append(escapeTextValue(data));
    return this;
  }

  comment(data: string): this {
    this.#buffer.append(`<!--`);
    this.#buffer.append(escapeCommentValue(data));
    this.#buffer.append(`-->`);
    return this;
  }

  element(
    tag: string,
    build: (builder: ElementHeadBuffer) => ElementBodyBuffer | void
  ): this {
    let head = ElementHeadBuffer.tagged(tag, this.#buffer);
    let body = build(head);

    if (body) {
      ElementBodyBuffer.flush(body);
    }

    return this;
  }

  serialize(): string {
    return this.#buffer.serialize();
  }
}

export function escapeAttrValue(value: string): string {
  if (typeof value.replace !== "function") {
    debugger;
  }
  // console.log(value);
  return value.replace(/"/g, `&quot;`);
}

function escapeTextValue(value: string): string {
  return value.replace(/</g, `&lt;`);
}

function escapeCommentValue(value: string): string {
  // These characters cause the tokenizer to leave the (collection of) comment states.
  return value.replace(/-/g, "&dash;").replace(/>/g, "&gt;");
}
