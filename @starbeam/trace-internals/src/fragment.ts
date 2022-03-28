import { isObject } from "@starbeam/fundamental";
import { exhaustive } from "@starbeam/verify";
import { CustomFormatter, getFormatter } from "./custom.js";
import { SHEET } from "./sheet.js";

export class StyledLine {
  static create(scalars: readonly Styled[]) {
    return new StyledLine([...scalars]);
  }

  readonly #styled: Styled[];

  constructor(styled: Styled[]) {
    this.#styled = styled;
  }

  prepend(...styled: IntoStyled[]): StyledLine {
    this.#styled.unshift(...styled.map(IntoStyled));
    return this;
  }

  append(...styled: IntoStyled[]): StyledLine {
    this.#styled.push(...styled.map(IntoStyled));
    return this;
  }

  join(separator: IntoStyled): StyledLine {
    const input = [...this.#styled];
    const last = input.pop();

    if (last === undefined) {
      return this;
    }

    const sep = IntoStyled(separator);
    const list: Styled[] = [];

    for (let styled of input) {
      list.push(group(styled, sep));
    }

    list.push(last);

    return new StyledLine(list);
  }

  isMultiline(): boolean {
    return this.scalars().some((s) => s.isMultiline());
  }

  scalars(): Scalar[] {
    return [...this.#styled].flatMap((s) => s.scalars());
  }

  attribute<K extends keyof Attributes>(
    key: K,
    value: Attributes[K]
  ): StyledLine {
    const scalars = this.scalars().map((s) => s.attribute(key, value));
    return new StyledLine(scalars);
  }

  oneline(): StyledLine {
    const scalars = this.scalars();
    const formatted = scalars.flatMap((s) => s.format());

    const out: Styled[] = [];
    let size = 0;

    function check(
      text: string,
      style?: string
    ): { done: true } | { done: false; compressed: string } {
      const next = text.length;
      const remaining = MAX - size;
      const compressed = compressNewlines(text);
      if (compressed.length > remaining - 1) {
        const truncated = compressed.slice(0, remaining - 1);
        out.push(
          style ? IntoStyled([truncated, style]) : IntoStyled(truncated)
        );
        out.push(SHEET.dim("…"));
        return { done: true };
      } else {
        size += next;
        return { done: false, compressed };
      }
    }

    const MAX = 80;

    done: for (const item of formatted) {
      switch (item.kind) {
        case "plain": {
          const checked = check(item.text);

          if (checked.done) {
            break done;
          }

          out.push(IntoStyled(checked.compressed));
          break;
        }
        case "%c": {
          const checked = check(item.text, item.style);

          if (checked.done) {
            break done;
          }

          out.push(IntoStyled([checked.compressed, item.style]));
          break;
        }
        case "%o": {
          const remaining = MAX - size;
          if (remaining < 3) {
            out.push(SHEET.dim("…"));
            break done;
          }

          size += 3;
          out.push(SHEET.inert("{"), SHEET.dim("…"), SHEET.inert("}"));
        }
      }
    }

    return new StyledLine(out);
  }

  #toCssLog(): unknown[] {
    const message = [];
    const styles: unknown[] = [];

    for (let scalar of this.#styled) {
      const formatted = scalar.format();

      for (const scalar of formatted) {
        switch (scalar.kind) {
          case "plain": {
            message.push(`%c${scalar.text}`);
            styles.push("");
            break;
          }
          case "%c": {
            message.push(`%c${scalar.text}`);
            styles.push(scalar.style);
            break;
          }
          case "%o": {
            message.push(`%o`);
            styles.push(scalar.value);
            break;
          }
          default: {
            exhaustive(scalar, `formatted.kind`);
          }
        }
      }
    }

    return [message.join(""), ...styles];
  }

  #toPlainLog(): unknown[] {
    const message = [];

    for (let scalar of this.#styled) {
      const formatted = scalar.format();

      for (const scalar of formatted) {
        switch (scalar.kind) {
          case "%c":
          case "plain": {
            message.push(scalar.text);
            break;
          }
          case "%o": {
            message.push(scalar.value);
            break;
          }
          default: {
            exhaustive(scalar, `formatted.kind`);
          }
        }
      }
    }

    return [message.join("")];
  }

  // TODO: ANSI
  toLogArgs(style: "plain" | "css"): unknown[] {
    switch (style) {
      case "plain":
        return this.#toPlainLog();
      case "css":
        return this.#toCssLog();
    }
  }
}

function compressNewlines(fragment: string): string {
  return fragment.replaceAll(/\s*[\n]\s*/g, " ");
}

// function compressStyledNewlines(
//   fragment: [text: string, style: string]
// ): [text: string, style: string] {
//   if (typeof fragment === "string") {
//     return fragment.replaceAll(/\s*[\r]?[\n]\s*/g, " ");
//   } else {
//     return [compressStyledNewlines(fragment[0]), fragment[1]];
//   }
// }

interface FormattedObject {
  readonly kind: "%o";
  readonly value: unknown;
}

interface FormattedStyledText {
  readonly kind: "%c";
  readonly text: string;
  readonly style: string;
}

interface FormattedPlain {
  readonly kind: "plain";
  readonly text: string;
}

export type Formatted = readonly FormattedScalar[];

export type FormattedScalar =
  | FormattedObject
  | FormattedStyledText
  | FormattedPlain;

export abstract class Styled {
  static from(styled: IntoStyled): Styled {
    return IntoStyled(styled);
  }

  abstract scalars(): readonly Scalar[];
  abstract attribute<K extends keyof Attributes>(
    key: K,
    value: Attributes[K]
  ): Styled;

  format(): Formatted {
    return this.scalars().flatMap((s) => s.format());
  }
}

type Emphasis = "Normal" | "Bold" | "Dim";
// class Emphasis extends Enum("Normal", "Bold", "Dim") {}

export interface Attributes {
  readonly heading: boolean;
  readonly emphasis: Emphasis;
}

function defaultAttributes(): Attributes {
  return {
    heading: false,
    emphasis: "Normal",
  };
}

type BooleanAttributes<A extends Attributes = Attributes> = {
  [P in keyof A]: boolean extends A[P] ? boolean : never;
};

type RegularAttributes<A extends Attributes = Attributes> = {
  [P in keyof Exclude<keyof A, keyof BooleanAttributes>]: A[P & keyof A];
};

export abstract class Scalar extends Styled {
  readonly #attributes: Attributes;

  constructor(attributes: Attributes) {
    super();
    this.#attributes = attributes;
  }

  abstract isMultiline(): boolean;

  attribute<K extends keyof BooleanAttributes>(key: K, value?: boolean): Scalar;
  attribute<K extends keyof RegularAttributes>(
    key: K,
    value: RegularAttributes[K]
  ): Scalar;
  attribute<K extends keyof Attributes>(key: K, value: Attributes[K]): Scalar {
    this.#attributes[key] = value;
    return this;
  }

  get attributes(): Attributes {
    return this.#attributes;
  }

  scalars(): readonly Scalar[] {
    return [this];
  }
}

export class SeparatorScalar extends Scalar {
  static create() {
    return new SeparatorScalar(defaultAttributes());
  }

  format(): Formatted {
    return [{ kind: "plain", text: " " }];
  }

  isMultiline(): boolean {
    return false;
  }
}

export const SP = SeparatorScalar.create();

export class StyledDelimited extends Styled {
  readonly #start: Styled;
  readonly #body: Styled;
  readonly #end: Styled;

  constructor(start: Styled, body: Styled, end: Styled) {
    super();
    this.#start = start;
    this.#body = body;
    this.#end = end;
  }

  attribute<K extends keyof Attributes>(key: K, value: Attributes[K]): Styled {
    return new StyledDelimited(
      this.#start.attribute(key, value),
      this.#body.attribute(key, value),
      this.#end.attribute(key, value)
    );
  }

  scalars(): readonly Scalar[] {
    return [
      ...this.#start.scalars(),
      ...this.#body.scalars(),
      ...this.#end.scalars(),
    ];
  }

  format(): Formatted {
    return [
      ...this.#start.format(),
      ...this.#body.format(),
      ...this.#end.format(),
    ];
  }
}

export class StyledAsValue extends Scalar {
  static create(value: unknown): StyledAsValue {
    return new StyledAsValue(value, defaultAttributes());
  }

  readonly #value: unknown;
  readonly #attributes: Attributes;

  private constructor(value: unknown, attributes: Attributes) {
    super(attributes);
    this.#value = value;
    this.#attributes = attributes;
  }

  isMultiline(): boolean {
    // hmmmm
    return false;
  }

  format(): Formatted {
    return [{ kind: "%o", value: this.#value }];
  }
}

export class StyledAsFormattedValue extends Styled {
  static create(
    value: unknown,
    formatter: CustomFormatter<unknown>
  ): StyledAsFormattedValue {
    return new StyledAsFormattedValue(value, formatter, null);
  }

  readonly #value: unknown;
  readonly #formatter: CustomFormatter<unknown>;
  #attributes: Partial<Attributes> | null;

  private constructor(
    value: unknown,
    formatter: CustomFormatter<unknown>,
    attributes: Attributes | null
  ) {
    super();
    this.#value = value;
    this.#formatter = formatter;
    this.#attributes = attributes;
  }

  attribute<K extends keyof Attributes>(key: K, value: Attributes[K]): Styled {
    if (this.#attributes === null) {
      this.#attributes = {} as Partial<Attributes>;
    }

    this.#attributes[key] = value;
    return this;
  }

  scalars(): readonly Scalar[] {
    let scalars = this.#formatter.format(this.#value).scalars();

    if (this.#attributes) {
      for (const [key, value] of Object.entries(this.#attributes)) {
        scalars = scalars.map((s) => s.attribute(key, value));
      }
    }

    return scalars;
  }
}

export type IntoStyled = unknown | [text: string, style: string] | Styled;
// export type IntoStyled = IntoScalar | Styled;
export type LogArgs = readonly IntoStyled[];

export function inspect(value: unknown): Styled {
  if (isObject(value)) {
    const formatter = getFormatter(value);
    if (formatter) {
      return StyledAsFormattedValue.create(value, formatter);
    }
  }

  return StyledAsValue.create(value);
}

export class StyledGroup extends Styled {
  readonly #styled: readonly Styled[];

  constructor(styled: readonly Styled[]) {
    super();
    this.#styled = styled;
  }

  attribute<K extends keyof Attributes>(key: K, value: Attributes[K]): Styled {
    return new StyledGroup(this.#styled.map((s) => s.attribute(key, value)));
  }

  join(styled: IntoStyled): StyledGroup {
    const scalars = [...this.#styled];
    const last = scalars.pop();

    if (last === undefined) {
      return this;
    }

    const sep = IntoStyled(styled);
    const list: Styled[] = [];

    for (let scalar of scalars) {
      list.push(group(scalar, sep));
    }

    list.push(last);

    return new StyledGroup(list);
  }

  scalars(): readonly Scalar[] {
    return this.#styled.flatMap((styled) => styled.scalars());
  }

  format(): Formatted {
    return this.#styled.flatMap((styled) => styled.format());
  }
}

export function group(...styled: IntoStyled[]): StyledGroup {
  return new StyledGroup(styled.map(IntoStyled));
}

export function delimited(
  start: IntoStyled,
  body: IntoStyled,
  end: IntoStyled
): Styled {
  return new StyledDelimited(
    IntoStyled(start),
    IntoStyled(body),
    IntoStyled(end)
  );
}

export function IntoStyled(from: IntoStyled): Styled {
  if (typeof from === "string") {
    return StyledFragment.create(from);
  } else if (from instanceof Styled) {
    return from;
  } else if (Array.isArray(from)) {
    const [text, style] = from;
    return StyledFragment.create(text, style);
  } else {
    return inspect(from);
  }
}

export function Line(scalars: readonly IntoStyled[]): StyledLine {
  const args = scalars.map(IntoStyled);
  return new StyledLine(args);
}

export class StyledFragment extends Scalar {
  static create(text: string, style?: string): StyledFragment {
    return new StyledFragment(text, style ?? null, defaultAttributes());
  }
  readonly #text: string;
  // CSS (for now)
  readonly #style: string | null;

  private constructor(
    text: string,
    style: string | null,
    attributes: Attributes
  ) {
    super(attributes);
    this.#text = text;
    this.#style = style;
  }

  isMultiline(): boolean {
    return /[\r\n]/.test(this.#text);
  }

  format(): Formatted {
    let style = this.#style ?? "";

    if (this.attributes.heading) {
      style += "; font-style: italic";
    }

    if (this.attributes.emphasis === "Bold") {
      style += "; font-weight: bold";
    } else {
      // eliminate bold from console.group unless specifically requested
      style += "; font-weight: normal";
    }

    if (style) {
      return [
        {
          kind: "%c",
          text: this.#text,
          style,
        },
      ];
    } else {
      return [
        {
          kind: "plain",
          text: this.#text,
        },
      ];
    }
  }
}
