const SPACING = 2;

export function stringifyJSON(obj: unknown): string {
  return JSON.stringify(obj, null, SPACING);
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = Record<string, JsonValue>;

export type JsonValue =
  | JsonPrimitive
  | JsonArray
  | { [key: string]: JsonValue };

export function isJSONObject(
  value: JsonValue | undefined
): value is JsonObject {
  return typeof value === "object" && value !== null;
}
