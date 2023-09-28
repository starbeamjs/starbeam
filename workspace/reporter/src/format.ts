import { matchPattern, stringify } from "@starbeam/core-utils";
import { terminalWidth } from "@starbeam-workspace/shared";
import chalk from "chalk";
import wrap from "wrap-ansi";

import { SPACES_PER_TAB } from "./constants.js";
import { Fragment, type IntoFragment, Style } from "./log.js";
import type { InternalLogOptions, LeadingOption } from "./reporter.js";

const INCREMENT_LEADING = 1;

class Leading {
  #spaces: number;
  #prefix: string | undefined;

  constructor(spaces: number, prefix: string | undefined) {
    this.#spaces = spaces;
    this.#prefix = prefix;
  }

  /**
   * The amount of characters that are unavailable for the content of the line. The line will be
   * wrapped to the amount of space available in the terminal minus the unavailable space.
   */
  get unavailable(): number {
    return this.#spaces + (this.#prefix?.length ?? EMPTY_PREFIX_SIZE);
  }

  asString({
    extra = EMPTY_PREFIX_SIZE,
  }: { extra?: number | undefined } = {}): string {
    return (
      " ".repeat(this.#spaces) +
      (this.#prefix ?? "") +
      " ".repeat(extra * SPACES_PER_TAB)
    );
  }
}

class WrappedLines {
  readonly #leading: Leading;
  readonly #lines: readonly WrappedLine[];

  constructor(
    lines: readonly WrappedLine[],
    {
      leading,
    }: {
      leading: Leading;
    },
  ) {
    this.#leading = leading;
    this.#lines = lines;
  }

  get lines(): readonly string[] {
    return this.#lines.flatMap((line) => line.toLines(this.#leading));
  }
}

class WrappedLine {
  readonly #first: string | undefined;
  readonly #rest: readonly string[];

  constructor({
    first,
    rest = [],
  }: {
    first: string | undefined;
    rest?: readonly string[];
  }) {
    this.#first = first;
    this.#rest = rest;
  }

  toLines(leading: Leading): readonly string[] {
    if (this.#first === undefined) {
      return [];
    }

    const first = `${leading.asString()}${this.#first}`;
    const rest = this.#rest.map(
      (line) => `${leading.asString({ extra: INCREMENT_LEADING })}${line}`,
    );

    return [first, ...rest];
  }
}

export const NO_LEADING = 0;

export function wrapLines(
  string: string,
  options: InternalLogOptions,
): WrappedLines {
  const lines = string.split("\n");
  const width = terminalWidth();

  const leading = computeColumns(string, options);

  const wrapped = lines.map((line) => {
    if (line.trim() === "") {
      return new WrappedLine({ first: line });
    }

    const wrapped = wrap(line, width - leading.unavailable, { trim: false });
    const [first, ...rest] = wrapped.split("\n");

    return new WrappedLine({ first, rest });
  });

  return new WrappedLines(wrapped, { leading });
}

const EMPTY_PREFIX_SIZE = 0;

function computeColumns(string: string, options: InternalLogOptions): Leading {
  return new Leading(computeLeading(string, options.leading), options.prefix);
}

function computeLeading(string: string, leading: LeadingOption): number {
  if (leading === "auto") {
    const leadingWS = string.split("\n").map((line) => {
      const match = matchPattern<[string]>(/^(\s*)/, line);
      const [leading] = match;
      return leading.length;
    });

    return Math.max(...leadingWS) * SPACES_PER_TAB;
  } else if ("indents" in leading) {
    return leading.indents * SPACES_PER_TAB;
  } else {
    return leading.spaces;
  }
}

export function wrapIndented(
  fragment: IntoFragment,
  options: InternalLogOptions,
): string {
  const string = String(Fragment.from(fragment));
  const wrapped = wrapLines(string, options);

  return wrapped.lines.join("\n");

  // const lines = string.split("\n");
  // const width = terminalWidth();

  // const formatted = lines.flatMap((line) => {
  //   if (line.trim() === "") {
  //     return [line];
  //   }

  //   // determine the number of spaces at the beginning of the line
  //   let spaces: number;

  //   if (columns) {
  //     spaces = columns;
  //   } else {
  //     const match = matchPattern<[string]>(/^(\s*)/, line);
  //     const [leading] = match;

  //     spaces = leading.length + SPACES_PER_TAB;
  //   }

  //   const wrapped = wrap(line, width - spaces, { trim: false });
  //   const [first, ...rest] = wrapped.split("\n");

  //   return [first, ...rest.map((l) => " ".repeat(spaces) + l.trim())];
  // });

  // return formatted.join("\n");
}

type FormatStyle =
  | {
      style: Style;
      indent?: number;
    }
  | {
      indent: number;
    }
  | Style
  | undefined;

type EntryStyle =
  | {
      key: Style;
      value: Style;
      indent?: number;
    }
  | FormatStyle;

export function format(value: string, style: FormatStyle): Fragment {
  return Fragment(
    getStyle(style),
    getIndentation(style) + wrapIndented(value, { leading: "auto" }),
  );
}

format.entry = ([key, value]: [string, string], style?: EntryStyle): string => {
  const keyStyle = getStyle(style, "key");
  const valueStyle = getStyle(style, "value");

  return wrapIndented(
    stringify`${Fragment(keyStyle, key)}: ${Fragment(valueStyle, value)}`,
    {
      leading: getLeading(style),
    },
  );
};

export function getStyle(
  style: EntryStyle | FormatStyle,
  part?: "key" | "value",
): Style {
  if (style === undefined) {
    return chalk.visible;
  } else if (Style.is(style)) {
    return style;
  } else if (typeof style === "function") {
    return style;
  } else if (part && part in style) {
    return (style as Record<"key" | "value", Style>)[part];
  } else if ("style" in style) {
    return style.style;
  } else {
    return chalk;
  }
}

function getLeading(style: EntryStyle | FormatStyle): LeadingOption {
  if (style === undefined || Style.is(style)) {
    return "auto";
  } else if (style.indent) {
    return { indents: style.indent };
  } else {
    return "auto";
  }
}

function getIndentation(style: EntryStyle | FormatStyle): string {
  if (style === undefined || Style.is(style)) {
    return "";
  } else if (style.indent) {
    return " ".repeat(style.indent);
  } else {
    return "";
  }
}
