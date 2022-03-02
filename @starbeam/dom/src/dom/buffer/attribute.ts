import { has, is, Position, positioned } from "@starbeam/core";
import { assert, QualifiedName, Wrapper } from "@starbeam/debug";
import { isObject } from "@starbeam/fundamental";
import {
  exhaustive,
  expected,
  present,
  verified,
  verify,
} from "@starbeam/verify";
import type { Buffer, Serialize, SerializeOptions } from "./body.js";
import { escapeAttrValue } from "./escape.js";

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

  abstract merge(newValue: this | string | null): void;
  abstract serializeInto(buffer: Buffer, options?: SerializeOptions): void;
}

export interface HtmlAttribute {
  readonly name: QualifiedName;
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

export function attrFor(
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
