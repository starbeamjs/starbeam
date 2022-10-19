import { Tree } from "@starbeam/debug";
import { describe, expect, test } from "vitest";

describe("a tree", () => {
  test("a simple tree", () => {
    const tree = Tree("hello", "goodbye");

    expect(tree.format()).toBe(strip`
      ├ hello
      ╰ goodbye
    `);
  });

  test("a more elaborate tree", () => {
    const tree = Tree(
      "package.json",
      ["app", ["components", "tab.js", "tab.hbs"], ["routes", "index.js"]],
      "pnpm-lock.yaml"
    );

    expect(tree.format()).toBe(strip`
      ├ package.json
      ├ app
      │ ├ components
      │ │ ├ tab.js
      │ │ ╰ tab.hbs
      │ ├ routes
      │ │ ╰ index.js
      ╰ pnpm-lock.yaml
    `);
  });
});

// strip leading whitespace from a tagged template literal
function strip(strings: TemplateStringsArray, ...values: unknown[]): string {
  const result = template(strings, ...values);

  // get the minimum indentation, ignoring the first and last line if they are empty
  const lines = split(result);

  const indents = minIndent(lines);

  // for each line, remove the leading ident, and then join the lines
  return lines.map((line) => line.slice(indents)).join("\n");
}

// remove the leading or trailing line from a string if it contains only whitespace, and return the remaining lines
function split(source: string): string[] {
  const lines = source.split("\n");

  // if there are no lines or exactly one line, return the string
  if (lines.length < 2) {
    return lines;
  }

  // if the first line is entirely whitespace, remove it
  if (lines[0]?.trim() === "") {
    lines.shift();
  }

  // if the last line is entirely whitespace, remove it
  if (lines[lines.length - 1]?.trim() === "") {
    lines.pop();
  }

  return lines;
}

function minIndent(lines: string[]): number {
  return Math.min(
    ...lines
      .filter((line) => line.trim() !== "")
      .map((line) => line.search(/\S/))
  );
}

// turn a template literal into a string
function template(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = "";
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += values[i];
    }
  }
  return result;
}
