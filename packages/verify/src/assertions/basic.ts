import { expected } from "../verify.js";
import { format } from "./describe.js";
import type { FixedArray, ReadonlyFixedArray } from "./type-utils.js";

export function isPresent<T>(value: T | null | undefined | void): value is T {
  return value !== null && value !== undefined;
}

expected.associate(isPresent, expected.toBe("present"));

export function exhaustive(_value: never, type?: string): never {
  if (type) {
    throw Error(`unexpected types left in ${type}`);
  } else {
    throw Error(`unexpected types left`);
  }
}

export type Primitive =
  | string
  | number
  | boolean
  | symbol
  | bigint
  | null
  | undefined;

export function isEqual<T>(value: T): (other: unknown) => other is T {
  function verify(input: unknown): input is T {
    return Object.is(input, value);
  }

  return expected.associate(
    verify,
    expected.toBe(String(value)).butGot(format)
  );
}

export function isNotEqual<T>(
  value: T
): <U>(other: U) => other is Exclude<U, T> {
  function verify<U>(input: U): input is Exclude<U, T> {
    return !Object.is(input, value);
  }

  return expected.associate(
    verify,
    expected.toBe(`not ${String(value)}`).butGot(format)
  );
}

export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

expected.associate(
  isObject,
  expected
    .toBe("an object")
    .butGot((value) => (value === null ? "null" : typeof value))
);

export function hasLength<L extends number>(length: L) {
  function has<T>(value: T[]): value is FixedArray<T, L>;
  function has<T>(value: readonly T[]): value is ReadonlyFixedArray<T, L>;
  function has<T>(value: T[] | readonly T[]): value is FixedArray<T, L> {
    return value.length === length;
  }

  return expected.associate(has, expected.toHave(`${length} items`));
}

export function hasItems<T>(
  value: readonly T[]
): value is [T, ...(readonly T[])] {
  return value.length > 0;
}

expected.associate(hasItems, expected.toHave(`at least one item`));

export function isNullable<In, Out extends In>(
  verifier: (value: In) => value is Out
): (value: In | null) => value is Out | null {
  function verify(input: In | null): input is Out | null {
    if (input === null) {
      return true;
    } else {
      return verifier(input);
    }
  }

  const expectation = expected.updated(verifier, {
    to: (to) => {
      if (to === undefined) {
        return ["to be", "nullable"];
      } else {
        return `${to[1]} or null`;
      }
    },
    actual: (actual) => {
      return (input: In | null) => {
        if (input === null) {
          return "null";
        } else if (actual) {
          return actual(input);
        } else {
          return undefined;
        }
      };
    },
  });

  expected.associate(verify, expectation);

  return verify;
}
