export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = Record<string, JsonValue>;

export type JsonValue =
  | JsonPrimitive
  | JsonArray
  | { [key: string]: JsonValue };

export function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null;
}
