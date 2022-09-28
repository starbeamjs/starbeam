import chalk from "chalk";
import terminalSize from "term-size";
import wrap from "wrap-ansi";

export function wrapIndented(string: string, columns?: number): string {
  const lines = string.split("\n");
  const terminalWidth = terminalSize().columns;

  const formatted = lines.flatMap((line) => {
    if (line.trim() === "") {
      return [line];
    }

    // determine the number of spaces at the beginning of the line
    let spaces: number;

    if (columns) {
      spaces = columns;
    } else {
      const match = line.match(/^(\s+)/);
      const length = match ? match[1].length : 0;

      spaces = length + 2;
    }

    const wrapped = wrap(line, terminalWidth - spaces, { trim: false });
    const [first, ...rest] = wrapped.split("\n");

    return [first, ...rest.map((line) => " ".repeat(spaces) + line.trim())];
  });

  return formatted.join("\n");
}

type Style = (value: string) => string;

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

export function format(value: string, style: FormatStyle): string {
  return getStyle(style)(getIndent(style) + wrapIndented(value));
}

format.entry = ([key, value]: [string, string], style?: EntryStyle): string => {
  const keyStyle = getStyle(style, "key");
  const valueStyle = getStyle(style, "value");
  const indent = getIndent(style);

  return wrapIndented(
    `${indent}${keyStyle(key)}: ${valueStyle(value)}`,
    key.length + 4
  );
};

function getStyle(
  style: EntryStyle | FormatStyle,
  part?: "key" | "value"
): Style {
  if (style === undefined) {
    return chalk.visible;
  } else if (typeof style === "function") {
    return style;
  } else if (part && part in style) {
    return (style as Record<"key" | "value", Style>)[part];
  } else if ("style" in style) {
    return style.style;
  } else {
    return chalk.visible;
  }
}

function getIndent(style: EntryStyle | FormatStyle): string {
  if (style === undefined) {
    return "";
  } else if (typeof style === "function") {
    return "";
  } else if (style.indent) {
    return " ".repeat(style.indent);
  } else {
    return "";
  }
}
