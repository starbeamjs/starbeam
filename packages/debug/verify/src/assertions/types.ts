import { define } from "../define.js";
import { expected } from "../verify.js";
import { isEqual, isObject } from "./basic.js";

const TYPE_DESC = {
  object: "an object",
  null: "null",
  undefined: "undefined",
  function: "a function",
  string: "a string",
  number: "a number",
  boolean: "a boolean",
  symbol: "a symbol",
  bigint: "a bigint",
};

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

export function hasType<K extends keyof TypeOfTypes>(
  type: K
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (value: any) => value is TypeOfTypes[K] {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function: (...args: any[]) => unknown;
}

export type TypeOf = keyof TypeOfTypes;

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
    (value: unknown): value is TypeOfTypes[K] => {
      return typeof value === type;
    },
    "name",
    `is:${type}`
  );

  define.builtin(verify, Symbol.toStringTag, `Verifier`);

  return expected.associate(
    verify,
    expected.toBe(TYPE_DESC[type]).butGot(typeName)
  );
}

function typeName(value: unknown): TypeOf {
  return value === null ? "null" : typeof value;
}
