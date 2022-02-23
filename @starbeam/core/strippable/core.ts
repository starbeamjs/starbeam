import type { PartialVerifyContext } from "../../verify/src/assert.js";
import { Abstraction } from "../../debug/src/abstraction.js";
import type { FinalizedContext, VerifyContext } from "./verify-context.js";
import type { UnsafeAny } from "../../trace-internals/src/wrapper.js";

export const narrow: <T, U extends T>(
  value: T,
  predicate: (input: T) => asserts input is U
) => U = abstractify(
  <T, U extends T>(value: T, predicate: (input: T) => asserts input is U) => {
    predicate(value);
    return value;
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function abstractify<F extends (...args: any[]) => any>(f: F): F {
  return ((...args: Parameters<F>): ReturnType<F> => {
    let start = Abstraction.start();

    try {
      let result = f(...args);
      Abstraction.end(start);
      return result;
    } catch (e) {
      Abstraction.end(start, e as Error);
    }
  }) as F;
}
