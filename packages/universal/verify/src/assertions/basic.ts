import { isPresentArray } from "@starbeam/core-utils";

import { expected, toKind } from "../verify.js";
import { format } from "./describe.js";
import type { FixedArray, ReadonlyFixedArray } from "./type-utils.js";

export function isPresent<T>(value: T): value is Exclude<T, null | undefined> {
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
    expected.toBe(inspect(value)).butGot(format),
  );
}

function inspect(value: unknown): string {
  if (isObject(value) && Symbol.for("nodejs.util.inspect.custom") in value) {
    return JSON.stringify(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (value as any)[Symbol.for("nodejs.util.inspect.custom")](),
    );
  } else {
    return JSON.stringify(value);
  }
}

export function isNotEqual<T>(
  value: T,
): <U>(other: U) => other is Exclude<U, T> {
  function verify<U>(input: U): input is Exclude<U, T> {
    return !Object.is(input, value);
  }

  return expected.associate(
    verify,
    expected.toBe(`not ${String(value)}`).butGot(format),
  );
}

export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

expected.associate(
  isObject,
  expected
    .toBe("an object")
    .butGot((value) => (value === null ? "null" : typeof value)),
);

export function isWeakKey(value: unknown): value is Record<string, unknown> {
  return (
    (typeof value === "object" || typeof value === "function") && value !== null
  );
}

expected.associate(
  isWeakKey,
  expected
    .toBe("an object or function")
    .butGot((value) => (value === null ? "null" : typeof value)),
);

interface HasLength<L extends number> {
  <T>(value: T[]): value is FixedArray<T, L>;
  <T>(value: T[] | readonly T[]): value is ReadonlyFixedArray<T, L>;
}

export function hasLength<L extends number>(length: L): HasLength<L> {
  function has<T>(value: T[] | readonly T[]): value is FixedArray<T, L> {
    return value.length === length;
  }

  return expected.associate(has, expected.toHave(`${length} items`));
}

export const hasItems = isPresentArray;

// export function hasItems<T>(
//   value: readonly T[]
// ): value is [T, ...(readonly T[])] {
//   return value.length > 0;
// }

expected.associate(hasItems, expected.toHave(`at least one item`));

export function isNullable<In, Out extends In>(
  verifier: (value: In) => value is Out,
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
        return `${toKind(to)} or null`;
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
