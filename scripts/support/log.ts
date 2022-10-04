import chalk from "chalk";
import {
  getSpecificStyle,
  getStyle,
  STYLE,
  STYLES,
  type AnyStyleName,
  type FullStyleName,
  type StyleName,
} from "./reporter/styles.js";

export function log(message: string, style: Style = Style.default): void {
  console.log(Style(style, message));
}

log.newline = () => log("");

type StyleFn = (message: string) => string;

/**
 * A subset of Chalk
 */
export interface StyleInstance extends StyleFn {
  inverse: StyleInstance;
}

export interface DetailedStyle {
  readonly [STYLE]: StyleInstance;
  readonly header?: StyleInstance;
  readonly decoration?: StyleInstance;
  [key: string]: StyleInstance | undefined;
}

export type Style = StyleInstance | DetailedStyle | StyleName | FullStyleName;

export type StyleRecord<N extends AnyStyleName = AnyStyleName> =
  N extends infer Name
    ? Name extends string
      ? {
          [P in Name]: Printable;
        }
      : never
    : never;

export type Printable = string | number | boolean;

export type StyleArgs =
  | [styled: StyleRecord]
  | [style: Style | undefined, message: Printable];

export const StyleArgs = {
  parse(args: StyleArgs): [Style, string] {
    if (args.length === 1) {
      const [styled] = args;
      const [style, message] = Object.entries(styled)[0];
      return [style as Style, String(message)];
    } else {
      return [args[0] ?? Style.default, String(args[1])];
    }
  },
};

export function Style(...args: StyleArgs): string {
  const [style, message] = StyleArgs.parse(args);

  const resolved = resolve(style);
  return resolved(message);
}

Style.is = (value: unknown): value is Style => {
  if (typeof value === "string") {
    return value in STYLES;
  } else if (typeof value === "function") {
    return true;
  } else if (value && typeof value === "object") {
    return "chalk" in value;
  } else {
    return false;
  }
};

Style.reset = (message: string): string => chalk.reset(message);
Style.default = chalk;

Style.inverted = (...args: StyleArgs): string => {
  const [style, message] = StyleArgs.parse(args);
  const resolved = Style.inverse(style);
  return Style(resolved, message);
};

Style.inverse = (style: Style): StyleInstance => {
  const resolved = resolve(style);
  return resolved.inverse;
};

Style.header = (style: Style | undefined, message: string): string => {
  if (style === undefined) {
    return message;
  } else if (typeof style === "string") {
    return Style(getSpecificStyle(style, "header"), message);
  } else if ("header" in style && style.header) {
    return style.header(message);
  } else {
    return Style(style, message);
  }
};

Style.decoration = (style: Style | undefined, message: string): string => {
  if (style === undefined) {
    return message;
  } else if (typeof style === "string") {
    return Style(getSpecificStyle(style, "decoration"), message);
  } else if ("decoration" in style && style.decoration) {
    return style.decoration(message);
  } else {
    return Style(style, message);
  }
};

export function isDetailed(value: unknown): value is DetailedStyle {
  return !!(value && STYLE in value);
}

function resolve(style: Style): StyleInstance {
  if (typeof style === "string") {
    return getStyle(style);
  } else if (isDetailed(style)) {
    return style[STYLE];
  } else {
    return style;
  }
}
