export type JsonArray = JsonValue[];
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonArray
  | JsonObject;
