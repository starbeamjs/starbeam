import {
  assert,
  exhaustive,
  present,
  verified,
  verify,
} from "../../strippable/assert";
import { has, is } from "../../strippable/minimal";
import { expected } from "../../strippable/verify-context";
import { QualifiedName, Wrapper } from "../../strippable/wrapper";
import { isObject, Position, positioned } from "../../utils";
import {
  Buffer,
  SerializeOptions,
  escapeAttrValue,
  Serialize,
  ElementState,
  ElementOptions,
  ElementBodyBuffer,
  ElementBody,
} from "./body";

export abstract class HtmlAttribute implements Serialize {
  static is(this: typeof HtmlAttribute, value: unknown): value is HtmlAttribute;
  static is<T extends HtmlAttribute>(
    this: { create(...args: any[]): T } & Function,
    value: unknown
  ): value is T;
  static is(value: unknown): boolean {
    return isObject(value) && value instanceof this;
  }

  static class(initial: string | null): HtmlAttribute {
    return ConcatAttribute.class(initial);
  }

  static concat(
    name: QualifiedName,
    initial: string | null,
    separator: string
  ): HtmlAttribute {
    return ConcatAttribute.create(name, initial, separator);
  }

  static default(name: QualifiedName, initial: string | null): HtmlAttribute {
    return ClobberAttribute.create(name, initial);
  }

  abstract readonly name: QualifiedName;

  abstract merge(newValue: this | string | null): void;
  abstract serializeInto(buffer: Buffer, options?: SerializeOptions): void;
}

export class ConcatAttribute extends HtmlAttribute {
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
    super();
    this.#value = value;
    this.#separator = separator;
  }

  serializeInto(buffer: Buffer, { prefix }: SerializeOptions): void {
    if (this.#value) {
      if (prefix) {
        buffer.append(prefix);
      }

      buffer.append(`${Wrapper.getInner(this.name)}="`);

      // TODO: Should we escape the separator
      for (let [part, position] of positioned(this.#value)) {
        buffer.append(escapeAttrValue(part));
        if (Position.hasNext(position)) {
          buffer.append(this.#separator);
        }
      }
      buffer.append(`"`);
    }
  }

  #push(...parts: string[]): void {
    if (this.#value) {
      this.#value.push(...parts);
    } else {
      this.#value = parts;
    }
  }

  // merge(newValue: string | null);
  // merge(newValue: this);
  merge(newValue: this | string | null) {
    let update = this.#normalize(newValue);

    if (update === null) {
      this.#value = null;
    } else {
      this.#push(...update);
    }
  }

  #normalize(value: HtmlAttribute | string | null): string[] | null {
    if (ConcatAttribute.is(value)) {
      return value.#value;
    } else {
      verify(value, is.nullable(has.typeof("string")));
      return value ? [value] : null;
    }
  }
}

export class ClobberAttribute extends HtmlAttribute {
  static create(name: QualifiedName, value: string | null) {
    return new ClobberAttribute(name, value);
  }

  #value: string | null;

  protected constructor(readonly name: QualifiedName, value: string | null) {
    super();
    this.#value = value;
  }

  serializeInto(buffer: Buffer, options: SerializeOptions): void {
    serializeAttr(buffer, options, this.name, this.#value);
  }

  get value(): string | null {
    return this.#value;
  }

  merge(newValue: this | string | null): void {
    if (ClobberAttribute.is(newValue)) {
      this.#value = newValue.#value;
    } else {
      verify(
        newValue,
        is.nullable(has.typeof("string")),
        expected(`value passed to ClobberAttribute#merge`).toBe(
          `another ClobberAttribute, a string or null`
        )
      );

      this.#value = newValue;
    }
  }
}

export class IdempotentAttribute extends HtmlAttribute {
  static create(
    name: QualifiedName,
    value: string | null
  ): IdempotentAttribute {
    return new IdempotentAttribute(name, value);
  }

  readonly #value: string | null;

  private constructor(readonly name: QualifiedName, value: string | null) {
    super();
    this.#value = value;
  }

  merge(newValue: this | string | null): void {
    let update = this.#normalize(newValue);
    newValue instanceof IdempotentAttribute ? newValue.#value : newValue;

    assert(
      this.#value === update,
      `An idempotent attribute must have the same value every time it was set. The current value of ${Wrapper.getInner(
        this.name
      )} was ${this.#value}, but you passed ${update}`
    );
  }

  #normalize(value: HtmlAttribute | string | null): string | null {
    if (IdempotentAttribute.is(value)) {
      return value.#value;
    } else {
      return verified(value, is.nullable(has.typeof("string")));
    }
  }

  serializeInto(buffer: Buffer, options?: SerializeOptions): void {
    serializeAttr(buffer, options || null, this.name, this.#value);
  }
}

export class AttributesBuffer implements Serialize {
  static empty(): AttributesBuffer {
    return new AttributesBuffer();
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

  idempotent(attr: HtmlAttribute): this {
    let current = this.#attrs.get(Wrapper.getInner(attr.name));

    if (current) {
      current.merge(attr);
    } else {
      this.initialize(attr);
    }

    return this;
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

export type AttrType =
  // an appropriate default for this attribute name (based on the IDL definition of the attribute)
  | "default"
  // updating the attribute value replaces the old one
  | "clobber"
  // there is no difference between initialization and update -- the value must always be the same
  | "idempotent"
  // the supplied attribute values are concatenated together with the separator
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
      case "default": {
        switch (Wrapper.getInner(name)) {
          case "class":
            return ConcatAttribute.create(name, value, " ");
          default:
            return ClobberAttribute.create(name, value);
        }
      }
      case "clobber":
        return ClobberAttribute.create(name, value);
      case "idempotent":
        return IdempotentAttribute.create(name, value);
      default:
        exhaustive(type, "AttrType");
    }
  }
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

export type Attributes = ReadonlyMap<string, string | null | AttributeValue>;

export interface AttributeValue {
  readonly value: string | null;
  readonly type?: AttrType;
}

export class ElementHeadBuffer {
  static tagged(tag: string, buffer: Buffer): ElementHeadBuffer {
    return new ElementHeadBuffer({ tag, buffer });
  }

  readonly #state: ElementState;
  readonly #attributes = AttributesBuffer.empty();

  private constructor(state: ElementState) {
    this.#state = state;
  }

  get #tag(): string {
    return this.#state.tag;
  }

  get #buffer(): Buffer {
    return this.#state.buffer;
  }

  attrs(map: Attributes): this {
    for (let [qualifiedName, attrValue] of map) {
      this.attr(qualifiedName, this.#normalizeAttrValue(attrValue));
    }

    return this;
  }

  attr(qualifiedName: string, attrValue: string | null | AttributeValue): this {
    let { value, type } = this.#normalizeAttrValue(attrValue);
    let attribute = attrFor(QualifiedName(qualifiedName), value, type);
    this.#attributes.initialize(attribute);
    return this;
  }

  idempotentAttr(qualifiedName: string, attrValue: string | null) {
    let attribute = attrFor(
      QualifiedName(qualifiedName),
      attrValue,
      "idempotent"
    );
    this.#attributes.idempotent(attribute);
    return this;
  }

  concatAttr(qualifiedName: string, value: string, separator: string): this {
    let attribute = attrFor(QualifiedName(qualifiedName), value, [
      "concat",
      separator,
    ]);
    this.#attributes.idempotent(attribute);
    return this;
  }

  /**
   * This is for splattributes
   */
  mergeAttr(qualifiedName: string, value: string | null): this {
    this.#attributes.merge(QualifiedName(qualifiedName), value);
    return this;
  }

  #normalizeAttrValue(attr: string | null | AttributeValue): {
    value: string | null;
    type: AttrType;
  } {
    if (attr === null || typeof attr === "string") {
      return { value: attr, type: "default" };
    } else {
      return { type: "default", ...attr };
    }
  }

  #flush(options: ElementOptions) {
    this.#buffer.append(`<${this.#tag}`);
    this.#attributes.serializeInto(this.#buffer);

    switch (options.body) {
      case "normal":
      case "void":
        this.#buffer.append(`>`);
        break;
      case "self-closing":
        this.#buffer.append(` />`);
        break;
      default:
        exhaustive(options.body);
    }
  }

  body(): ElementBodyBuffer {
    this.#flush({ body: "normal" });
    return ElementBodyBuffer.create(this.#state);
  }

  empty(type: ElementBody = "normal"): void {
    this.#flush({ body: type });

    if (type === "normal") {
      this.#buffer.append(`</${this.#tag}>`);
    }
  }
}
