import {
  isArray,
  isObject,
  isPrimitive,
  type JsonValue,
} from "typed-json-utils";
import { assertType } from "vitest";

export function stringify(value: JsonValue): string {
  if (value === null) {
    return "null";
  }

  if (isPrimitive(value)) {
    // value is string, number, boolean or undefined
    return JSON.stringify(value);
  }

  if (isArray(value)) {
    // value is JsonArray
    return `[${value.map(stringify).join(", ")}]`;
  }

  if (isObject(value)) {
    // value is JsonObject
    return `{${Object.entries(value)
      .map(([key, value]) => {
        // key is string, value is JsonValue
        return `${key}: ${stringify(value)}`;
      })
      .join(", ")}}`;
  }

  // value is never
  assertNever(value);
}

function assertNever(value: never): never {
  assertType<never>(value);
  return value;
}
