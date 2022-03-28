import {
  describeTypeofFor,
  isNull,
  isObject,
  isTypeofType,
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

function typeofVerifier<T>(typeOf: string): VerifierFunction<unknown, T> {
  const verifier: VerifierFunction<unknown, T> = isTypeofType(typeOf);

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
  undefined: typeofVerifier<undefined>("undefined"),
  function: typeofVerifier<(...args: unknown[]) => unknown>("function"),
  string: typeofVerifier<string>("string"),
  number: typeofVerifier<number>("number"),
  boolean: typeofVerifier<boolean>("boolean"),
  symbol: typeofVerifier<symbol>("symbol"),
  bigint: typeofVerifier<bigint>("bigint"),
} as const;

type IsTypeof = typeof IS_TYPEOF;

/**
 * Verify that a value has a specified typeof type. If `type` is `"object"`,
 * this function verifies that the value is an object **and** not null.
 */
export function isType<K extends keyof IsTypeof>(type: K): IsTypeof[K] {
  return IS_TYPEOF[type];
}
