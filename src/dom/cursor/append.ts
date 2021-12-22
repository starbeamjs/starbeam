import { assert, exhaustive, present } from "../../strippable/assert";
import { QualifiedName, Wrapper } from "../../strippable/wrapper";
import { Position, positioned } from "../../utils";

export interface HtmlAttribute extends Serialize {
  readonly name: QualifiedName;

  merge(newValue: string | null): void;
}

interface SerializeOptions {
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

export const HtmlAttribute = {
  class(initial: string | null): HtmlAttribute {
    return ConcatAttribute.class(initial);
  },

  concat(
    name: QualifiedName,
    initial: string | null,
    separator: string
  ): HtmlAttribute {
    return ConcatAttribute.create(name, initial, separator);
  },

  default(name: QualifiedName, initial: string | null): HtmlAttribute {
    return ClobberAttribute.create(name, initial);
  },
};

export class ConcatAttribute implements HtmlAttribute {
  static class(initial: string | null): ConcatAttribute {
    return new ConcatAttribute(
      QualifiedName("class"),
      initial ? [initial] : null,
      " "
    );
  }

  static create(
    name: QualifiedName,
    initial: string | null,
    separator: string
  ): ConcatAttribute {
    return new ConcatAttribute(name, initial ? [initial] : null, separator);
  }

  #value: string[] | null;
  #separator: string;

  private constructor(
    readonly name: QualifiedName,
    value: string[] | null,
    separator: string
  ) {
    this.#value = value;
    this.#separator = separator;
  }

  serializeInto(buffer: Buffer, { prefix }: SerializeOptions): void {
    if (this.#value) {
      if (prefix) {
        buffer.append(prefix);
      }

      buffer.append(`${Wrapper.getInner(this.name)}="`);
      for (let [part, position] of positioned(this.#value)) {
        buffer.append(escapeAttrValue(part));
        if (Position.hasNext(position)) {
          buffer.append(this.#separator);
        }
      }
      buffer.append(`"`);
    }
  }

  #push(part: string): void {
    if (this.#value) {
      this.#value.push(part);
    } else {
      this.#value = [part];
    }
  }

  merge(newValue: string | null) {
    if (newValue === null) {
      this.#value = null;
    } else {
      this.#push(newValue);
    }
  }
}

export class ClobberAttribute implements HtmlAttribute {
  static create(name: QualifiedName, value: string | null) {
    return new ClobberAttribute(name, value);
  }

  #value: string | null;

  private constructor(readonly name: QualifiedName, value: string | null) {
    this.#value = value;
  }

  serializeInto(buffer: Buffer, options: SerializeOptions): void {
    serializeAttr(buffer, options, this.name, this.#value);
  }

  get value(): string | null {
    return this.#value;
  }

  merge(newValue: string | null): void {
    this.#value = newValue;
  }
}

export class IdempotentAttribute implements HtmlAttribute {
  static create(
    name: QualifiedName,
    value: string | null
  ): IdempotentAttribute {
    return new IdempotentAttribute(name, value);
  }

  readonly #value: string | null;

  private constructor(readonly name: QualifiedName, value: string | null) {
    this.#value = value;
  }

  merge(newValue: string | null): void {
    assert(
      this.#value === newValue,
      `An idempotent attribute must have the same value every time it was set. The current value of ${Wrapper.getInner(
        this.name
      )} was ${this.#value}, but you passed ${newValue}`
    );
  }

  serializeInto(buffer: Buffer, options?: SerializeOptions): void {
    serializeAttr(buffer, options || null, this.name, this.#value);
  }
}

export class Attributes implements Serialize {
  static empty(): Attributes {
    return new Attributes();
  }

  readonly #attrs = new Map<string, HtmlAttribute>();

  private constructor() {}

  initialize(attr: HtmlAttribute) {
    this.#attrs.set(Wrapper.getInner(attr.name), attr);
  }

  merge(name: QualifiedName, value: string | null): void {
    let attr = present(this.#attrs.get(Wrapper.getInner(name)));
    attr.merge(value);
  }

  serializeInto(buffer: Buffer, options?: SerializeOptions): void {
    buffer.appending(
      nullableList(this.#attrs.values()),
      (attrs) => {
        for (let attr of attrs) {
          attr.serializeInto(buffer, { prefix: " " });
        }
      },
      options || null
    );
  }
}

type AttrType =
  | "class"
  | "default"
  | "idempotent"
  | [type: "concat", separator: string];

function attrFor(
  name: QualifiedName,
  value: string | null,
  type: AttrType
): HtmlAttribute {
  if (Array.isArray(type)) {
    return ConcatAttribute.create(name, value, type[1]);
  } else {
    switch (type) {
      case "class":
        return ConcatAttribute.create(name, value, " ");
      case "default":
        return ClobberAttribute.create(name, value);
      case "idempotent":
        return IdempotentAttribute.create(name, value);
      default:
        exhaustive(type, "AttrType");
    }
  }
  // if (type === "class") {
  //   return ConcatAttribute.create(name, value, " ");
  // } else if (type === "default") {
  //   return ClobberAttribute.create(name, value);

  // } else {
  //   exhaustive(type);
  // }
}

function nullableList<T>(iterable: Iterable<T>): readonly T[] | null {
  let list = [...iterable];

  return list.length === 0 ? null : list;
}

function serializeAttr(
  buffer: Buffer,
  options: SerializeOptions | null,
  name: QualifiedName,
  value: string | null
) {
  buffer.appending(
    value,
    (v) => {
      buffer.append(`${Wrapper.getInner(name)}="`);
      buffer.append(escapeAttrValue(v));
      buffer.append(`"`);
    },
    options
  );
}

export class ElementHeadBuffer {
  static tagged(tag: string, buffer: Buffer): ElementHeadBuffer {
    return new ElementHeadBuffer(tag, buffer);
  }

  readonly #buffer: Buffer;
  readonly #tag: string;
  readonly #attributes = Attributes.empty();

  private constructor(tag: string, buffer: Buffer) {
    this.#tag = tag;
    this.#buffer = buffer;
  }

  attr(
    qualifiedName: string,
    value: string | null,
    type: AttrType = qualifiedName === "class" ? "class" : "default"
  ): this {
    let attribute = attrFor(QualifiedName(qualifiedName), value, type);
    this.#attributes.initialize(attribute);
    return this;
  }

  mergeAttr(qualifiedName: string, value: string | null): this {
    this.#attributes.merge(QualifiedName(qualifiedName), value);
    return this;
  }

  body(): ElementBodyBuffer {
    this.#buffer.append(`<${this.#tag}`);
    this.#attributes.serializeInto(this.#buffer);
    this.#buffer.append(`>`);
    return ElementBodyBuffer.create(this.#tag, this.#buffer);
  }
}

export interface ContentBuffer {
  text(data: string): this;
  comment(data: string): this;
  element(
    tag: string,
    build: (builder: ElementHeadBuffer) => ElementBodyBuffer
  ): this;
}

export class ElementBodyBuffer implements ContentBuffer {
  static create(tag: string, buffer: Buffer): ElementBodyBuffer {
    return new ElementBodyBuffer(tag, buffer, HtmlBuffer.of(buffer));
  }

  static flush(builder: ElementBodyBuffer): void {
    builder.#buffer.append(`</${builder.#tag}>`);
  }

  readonly #tag: string;
  readonly #buffer: Buffer;
  readonly #content: HtmlBuffer;

  constructor(tag: string, buffer: Buffer, content: HtmlBuffer) {
    this.#tag = tag;
    this.#buffer = buffer;
    this.#content = content;
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
    build: (builder: ElementHeadBuffer) => ElementBodyBuffer
  ): this {
    this.#content.element(tag, build);
    return this;
  }
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
    build: (builder: ElementHeadBuffer) => ElementBodyBuffer
  ): this {
    let head = ElementHeadBuffer.tagged(tag, this.#buffer);
    let body = build(head);
    ElementBodyBuffer.flush(body);
    return this;
  }

  serialize(): string {
    return this.#buffer.serialize();
  }
}

function escapeAttrValue(value: string): string {
  return value.replace(/"/g, `&quot;`);
}

function escapeTextValue(value: string): string {
  return value.replace(/</g, `&lt;`);
}

function escapeCommentValue(value: string): string {
  // These characters cause the tokenizer to leave the (collection of) comment states.
  return value.replace(/-/g, "&dash;").replace(/>/g, "&gt;");
}
