import type { JsonValue } from "@starbeam-workspace/json";
import chalk from "chalk";

import { exhaustive } from "./utils.js";

/**
 * Convert the JSON value to a string, formatted appropriately.
 *
 * While this does not emit newlines (as that's handled by the jsonc
 * formatter), it does insert whitespaces around colons and commas.
 */
export function stringify(value: JsonValue): string {
  if (isPrimitive(value)) {
    return chalk.cyan(JSON.stringify(value));
  }

  if (Array.isArray(value)) {
    return ["[", value.map((v) => stringify(v)).join(", "), "]"].join(" ");
  }

  if (typeof value === "object") {
    return [
      "{",
      Object.entries(value)
        .map(([key, value]) => `${JSON.stringify(key)}: ${stringify(value)}`)
        .join(", "),
      "}",
    ].join(" ");
  }

  exhaustive(value);
}

function isPrimitive(
  value: JsonValue,
): value is string | number | boolean | null {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}

if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest;

  describe("stringify", () => {
    test("string", () => {
      expect(stringify("foo")).toEqual('"foo"');
    });

    test("number", () => {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      expect(stringify(1)).toEqual("1");
    });

    test("boolean", () => {
      expect(stringify(true)).toEqual("true");
      expect(stringify(false)).toEqual("false");
    });

    test("null", () => {
      expect(stringify(null)).toEqual("null");
    });

    test("array", () => {
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      expect(stringify([1, 2, 3])).toEqual("[ 1, 2, 3 ]");
    });

    test("object", () => {
      expect(stringify({ one: "1" })).toEqual(`{ "one": "1" }`);
      expect(stringify({ one: "1", two: "2" })).toEqual(
        `{ "one": "1", "two": "2" }`,
      );
    });
  });
}
