export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null;
}
