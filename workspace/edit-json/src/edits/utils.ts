import type { JsonPrimitive } from "@starbeam/core-utils";
import type { JsonObject, JsonValue } from "@starbeam-workspace/json";
import chalk from "chalk";
import type * as jsonc from "jsonc-parser";

import type { SourceRange } from "../representation/source.js";
import { JsoncModification } from "./edits.js";

const DOT = chalk.gray(".");
const OPEN_BRACKET = chalk.gray("[");
const CLOSE_BRACKET = chalk.gray("]");

export function formatPath(segments: jsonc.JSONPath): string {
  let formatted = chalk.gray(`<root>`);

  for (const segment of segments) {
    formatted +=
      typeof segment === "string"
        ? `${DOT}${chalk.yellowBright(segment)}`
        : `${OPEN_BRACKET}${chalk.yellowBright(segment)}${CLOSE_BRACKET}`;
  }

  return formatted;
}

export const DESCRIBE_CHANGE = {
  replace: "Replacing",
  "insert:before": "Inserting before",
  "insert:after": "Inserting after",
  append: "Appending to this array",
  remove: "Removing",
};

export function rangeToModification(
  {
    edit: editRange,
    format: formatRange,
  }: {
    edit: SourceRange;
    format: SourceRange;
  },
  content = "",
): JsoncModification {
  const delta = content.length - editRange.length;

  const edit = {
    ...editRange.asJsoncRange(),
    content,
  } satisfies jsonc.Edit;

  // Format the entire parent node. For example, if we've just removed an array
  // element, format the entire array.
  const format = {
    offset: formatRange.start,
    length: formatRange.length + delta,
  } satisfies jsonc.Range;

  return JsoncModification.of(edit, [editRange], format);
}

export function isEquivalent(
  a: JsonValue | undefined,
  b: JsonValue | undefined,
): boolean {
  if (typeof a !== typeof b) return false;
  if (a === undefined || b === undefined) return a === b;

  if (isPrimitive(a) || isPrimitive(b)) {
    return Object.is(a, b);
  }

  if (isArray(a)) {
    return isArray(b) && isEquivalentArray(a, b);
  }

  if (isArray(b)) {
    return isArray(a) && isEquivalentArray(a, b);
  }

  if (a === null || b === null) return a === null && b === null;

  return isEquivalentObject(a, b);
}

function isEquivalentArray(a: JsonValue[], b: JsonValue[]): boolean {
  return (
    a.length === b.length &&
    a.every((v, i) => isEquivalent(v, b[i] as JsonValue | undefined))
  );
}

function isEquivalentObject(a: JsonObject, b: JsonObject): boolean {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();

  if (aKeys.length !== bKeys.length) return false;
  if (JSON.stringify(aKeys) !== JSON.stringify(bKeys)) return false;

  return aKeys.every((key) => isEquivalent(a[key] as JsonValue, b[key]));
}

function isArray(value: JsonValue): value is JsonValue[] {
  return Array.isArray(value);
}

function isPrimitive(value: JsonValue): value is JsonPrimitive {
  return (
    typeof value === "string" || typeof value === "number" || value === null
  );
}
