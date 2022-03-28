import { exhaustive } from "./assert.js";

export function isObject<T>(value: T): value is T & object {
  return typeof value === "object" && value !== null;
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export interface Verifier<In, Out extends In> {
  (value: In): value is Out;
}

export type TypeOf =
  | "string"
  | "number"
  | "bigint"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function";

export function describeTypeofFor(
  value: unknown,
  howMany: 0 | 1 | "2+"
): string {
  let typeOf: TypeOf | "null" = value === null ? "null" : typeof value;

  switch (howMany) {
    case 0:
    case "2+":
      switch (typeOf) {
        case "bigint":
          return `bigints`;
        case "boolean":
          return "booleans";
        case "function":
          return "functions";
        case "number":
          return "numbers";
        case "object":
          return "objects";
        case "string":
          return "string";
        case "symbol":
          return "symbols";
        case "undefined":
          return "undefined values";
        case "null":
          return "null objects";
        default:
          exhaustive(typeOf, `typeof anything or 'null'`);
      }
      break;
    case 1:
      switch (typeOf) {
        case "bigint":
          return `a bigint`;
        case "boolean":
          return "a boolean";
        case "function":
          return "a function";
        case "number":
          return "a number";
        case "object":
          return "an object";
        case "string":
          return "a string";
        case "symbol":
          return "a symbol";
        case "undefined":
          return "an undefined value";
        case "null":
          return "a null object";
        default:
          exhaustive(typeOf, `typeof anything or 'null'`);
      }
  }
}

export function isTypeofType<T>(
  typeOf: string,
  impl?: (verifier: Verifier<unknown, T>) => void
): Verifier<unknown, T> {
  const verifier = (value: unknown): value is T => {
    return typeof value === typeOf;
  };

  if (impl) {
    impl(verifier);
  }

  return verifier;
}
