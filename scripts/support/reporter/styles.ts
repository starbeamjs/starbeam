import chalk from "chalk";
import { isDetailed, type DetailedStyle, type StyleInstance } from "../log.js";
import { Union, type Into, type AsString } from "../type-magic.js";

export const STYLE = Symbol("STYLE");
export type STYLE = typeof STYLE;

const header = createStyle(chalk.redBright, {
  dim: chalk.greenBright,
  sub: chalk.redBright.dim,
});

const problem = createStyle(chalk.red, {
  header: chalk.redBright,
  decoration: chalk.redBright,
  dim: chalk.red.dim,
});

const comment = createStyle(chalk.gray, {
  dim: chalk.gray.dim,
});

const ok = createStyle(chalk.green);

function createStyle<S>(
  style: StyleInstance,
  styles?: S & Omit<DetailedStyle, STYLE>
): S & DetailedStyle {
  return { [STYLE]: style, ...styles } as S & DetailedStyle;
}

function createStyles<S extends Record<string, DetailedStyle>>(styles: S): S {
  return styles;
}

export const STYLES = createStyles({
  ok,
  problem,
  comment,
  header,
});

export type STYLES = typeof STYLES;
export type StyleName = keyof STYLES;

export class StylePart extends Union("header", "decoration", "sub", "dim") {}
export type IntoStylePart = Into<StylePart>;
export type StylePartName = AsString<StylePart>;

export type FullStyleName = `${StyleName}:${StylePartName}`;
export type AnyStyleName = StyleName | FullStyleName;

export function getStyle(name: AnyStyleName): StyleInstance {
  if (isStyleName(name)) {
    const style = STYLES[name] as DetailedStyle;
    return resolve(style);
  }

  const [styleName, part] = name.split(":") as [StyleName, StylePartName];

  const style = STYLES[styleName] as DetailedStyle;

  if (hasPart(style, part)) {
    return resolve(style[part]);
  } else {
    return resolve(style);
  }
}

function resolve(style: StyleInstance | DetailedStyle): StyleInstance {
  if (isDetailed(style)) {
    return style[STYLE];
  } else {
    return style;
  }
}

export function getSpecificStyle(
  name: StyleName | FullStyleName,
  specific: StylePartName
): StyleInstance {
  if (isStyleName(name)) {
    return getStyle(`${name}:${specific}`);
  } else {
    return getStyle(name);
  }
}

export function hasPart<K extends StylePartName>(
  style: DetailedStyle,
  part: K
): style is DetailedStyle & { [P in K]: DetailedStyle } {
  return part in style;
}

export function isStyleName(value: unknown): value is StyleName {
  return typeof value === "string" && value in STYLES;
}

export function isAnyStyleName(value: unknown): value is AnyStyleName {
  if (isStyleName(value)) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  const [styleName, part] = value.split(":");

  return isStyleName(styleName) && isPartName(part);
}

export function isPartName(value: unknown): value is StylePart {
  return StylePart.isMember(value);
}
