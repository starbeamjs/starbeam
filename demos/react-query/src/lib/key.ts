export type Serializable =
  | string
  | number
  | boolean
  | null
  | SerializableObject
  | Serializable[];

type SerializableObject = {
  [P in string]: Serializable;
};

function hasToJSON(value: object): value is { toJSON(): Serializable } {
  const toJSON = (value as Record<string, unknown>).toJSON;
  return typeof toJSON === "function";
}

export function serialize(value: Serializable): string {
  if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    return value.toString();
  } else if (typeof value === "boolean") {
    return value.toString();
  } else if (value === null) {
    return "null";
  } else if (Array.isArray(value)) {
    return "[" + value.map(serialize).join(",") + "]";
  } else if (typeof value === "object") {
    if (hasToJSON(value)) {
      return serialize(value.toJSON());
    }

    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys.map((key) => `"${key}":${serialize(value[key])}`).join(",") +
      "}"
    );
  } else {
    throw new Error("Cannot serialize value");
  }
}
