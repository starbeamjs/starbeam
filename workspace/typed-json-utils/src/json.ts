export type JsonPrimitive = string | number | boolean | null;
export type ReadonlyJsonArray = readonly JsonValue[];
export type JsonArray = JsonValue[];

export type ReadonlyJsonObject = Readonly<Record<string, JsonValue>>;
export type JsonObject = Record<string, JsonValue>;

export type JsonValue =
  | JsonPrimitive
  | JsonArray
  | { [key: string]: JsonValue };

export type ReadonlyJsonValue = JsonPrimitive | ReadonlyJsonArray | JsonValue;

export function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !isArray(value);
}

export function isArray(value: JsonValue | undefined): value is JsonArray {
  return Array.isArray(value);
}

export type PrimitiveType =
  | typeof String
  | typeof Boolean
  | typeof Number
  | null;

export type PrimitiveFor<T extends PrimitiveType> = T extends typeof String
  ? string
  : T extends typeof Boolean
  ? boolean
  : T extends typeof Number
  ? number
  : T;

export function isPrimitive<T extends PrimitiveType>(
  value: JsonValue | undefined,
  type?: T | undefined,
): value is PrimitiveFor<T> {
  switch (type) {
    case undefined:
      return (
        value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string"
      );

    case Boolean:
      return typeof value === "boolean";
    case Number:
      return typeof value === "number";
    case String:
      return typeof value === "string";
    default:
      return value === null;
  }
}
