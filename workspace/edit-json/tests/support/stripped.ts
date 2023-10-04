import type { JsonValue } from "@starbeam/core-utils";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

/**
 * Strip the leading and trailing indent from a string.
 *
 * This is a template-literal function.
 *
 * A line's indent is the number of whitespace characters before a
 * non-whitespace character.
 *
 * The minimum indent for all lines is determined by computing the indentation
 * of all lines that have at least one non-whitespace character.
 *
 * All leading and trailing lines that are entirely whitespace are removed.
 *
 * If the first line is not entirely whitespace, it is included in the output
 * as-is. All other lines that are included in the output are included after the
 * minimum indentation is removed.
 */
export function strippedJSON(
  constant: TemplateStringsArray,
  ...values: JsonValue[]
): string {
  const string = constant
    .map(
      (string, i) =>
        `${string}${values[i] === undefined ? "" : JSON.stringify(values[i])}`,
    )
    .join("");

  const [first, ...rest] = string.split("\n");
  if (first === undefined) return "";

  // if the first line is not an empty line, ignore it for now.
  const { lines, unshift } = /\S/.exec(first)
    ? { lines: rest, unshift: first }
    : { lines: rest, unshift: undefined };

  let minIndent = Infinity;

  for (const line of lines) {
    const match = /\S/.exec(line);
    if (match) {
      minIndent = Math.min(minIndent, match.index);
    }
  }

  const allLines = lines.map((line) => line.slice(minIndent));

  if (unshift) {
    allLines.unshift(unshift);
  }

  while (true) {
    const lastLine = allLines.at(-1);

    if (lastLine === undefined || /\S/.exec(lastLine)) {
      break;
    } else {
      allLines.pop();
    }
  }

  return allLines.join("\n");
}

describe("stripped", () => {
  test("one line", () => {
    expect(strippedJSON`{
      "hello": "world"
    }`).toBe('{\n  "hello": "world"\n}');
  });

  test("multiline", () => {
    expect(strippedJSON`
      {
        "hello": "world"
      }
    `).toBe(`{\n  "hello": "world"\n}`);
  });
});
