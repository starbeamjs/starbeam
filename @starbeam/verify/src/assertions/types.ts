import { define } from "../define.js";
import { expected } from "../verify.js";
import { isEqual, isObject } from "./basic.js";

export function hasType<K extends keyof TypeOfTypes>(
  type: K
): (value: unknown) => value is TypeOfTypes[K] {
  return IS_TYPEOF[type] as (value: unknown) => value is TypeOfTypes[K];
}

interface TypeOfTypes {
  string: string;
  number: number;
  bigint: bigint;
  boolean: boolean;
  symbol: symbol;
  undefined: undefined;
  null: null;
  object: object;
  function: (...args: unknown[]) => unknown;
}

export type TypeOf = keyof TypeOfTypes;

const IS_TYPEOF = {
  object: isObject,
  null: isEqual(null),
  undefined: isTypeof("undefined"),
  function: isTypeof("function"),
  string: isTypeof("string"),
  number: isTypeof("number"),
  boolean: isTypeof("boolean"),
  symbol: isTypeof("symbol"),
  bigint: isTypeof("bigint"),
} as const;

/**
 * Verify that a value has a specified typeof type. If `type` is `"object"`,
 * this function verifies that the value is an object **and** not null.
 */
function isTypeof<K extends keyof TypeOfTypes>(
  type: K
): (value: unknown) => value is TypeOfTypes[K] {
  if (type === "object") {
    return isObject as (value: unknown) => value is TypeOfTypes[K];
  }

  const verify = define.builtin(
    function verify(value: unknown): value is TypeOfTypes[K] {
      return typeof value === type;
    },
    "name",
    `is${type}`
  );

  define.builtin(verify, Symbol.toStringTag, `Verifier`);

  return expected.associate(verify, expected.toBe(type).butGot(typeName));
}

function typeName(value: unknown): TypeOf {
  return value === null ? "null" : typeof value;
}
