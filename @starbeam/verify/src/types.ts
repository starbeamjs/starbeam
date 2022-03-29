import {
  describeTypeofFor,
  isNull,
  isObject,
  isTypeof,
  type TypeForTypeOf,
  type TypeOf,
  type VerifierFunction,
} from "@starbeam/fundamental";
import { Verifier } from "./assert.js";
import { expected } from "./verify-context.js";

Verifier.implement(
  isObject,
  expected("value")
    .toBe(`an object`)
    .butGot((value): TypeOf | "null" => {
      return value === null ? "null" : typeof value;
    })
);

function typeofVerifier<Type extends TypeOf>(
  typeOf: Type
): VerifierFunction<unknown, TypeForTypeOf<Type>> {
  const verifier: VerifierFunction<unknown, TypeForTypeOf<Type>> = isTypeof(
    typeOf
  );

  Verifier.implement(
    verifier,
    expected(`typeof value`)
      .toBe(typeOf)
      .butGot((value) => describeTypeofFor(value, 1))
  );

  return verifier;
}

const IS_TYPEOF = {
  object: isObject,
  null: isNull,
  undefined: typeofVerifier("undefined"),
  function: typeofVerifier("function"),
  string: typeofVerifier("string"),
  number: typeofVerifier("number"),
  boolean: typeofVerifier("boolean"),
  symbol: typeofVerifier("symbol"),
  bigint: typeofVerifier("bigint"),
} as const;

type IsTypeof = typeof IS_TYPEOF;

/**
 * Verify that a value has a specified typeof type. If `type` is `"object"`,
 * this function verifies that the value is an object **and** not null.
 */
export function isType<K extends keyof IsTypeof>(type: K): IsTypeof[K] {
  return IS_TYPEOF[type];
}
