import { Stack } from "@starbeam/debug-utils";

export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function exhaustive(value: never, description: string): never {
  return Stack.entryPoint(() => {
    throw Error(
      `Expected ${description} to be exhaustively matched, but it wasn't`
    );
  });
}

export function assert(
  condition: unknown,
  assumption: string | (() => string)
): asserts condition {
  Stack.entryPoint(() => {
    if (!condition) {
      const error = typeof assumption === "string" ? assumption : assumption();
      throw Error(`An assumption was incorrect: ${error}`);
    }
  });
}

export interface Check<Out extends In, In = unknown> {
  test: (value: In) => value is Out;
  failure: (value: In) => string;
}

export type AdHocCheck<Out extends In, In = unknown> = [
  predicate: (value: In) => value is Out,
  message: (value: In) => string
];

export function check<Out extends In, In>(
  value: In,
  test: (value: In) => value is Out,
  message: (value: In) => string
): asserts value is Out;
export function check<Out extends In, In>(
  value: In,
  check: Check<Out, In>
): asserts value is Out;
export function check<In, Out extends In>(
  value: In,
  ...validator: [Check<Out, In>] | AdHocCheck<Out, In>
): asserts value is Out {
  Stack.entryPoint(() => {
    checkValue(value, checker(validator));
  });
}

export function checked<Out extends In, In>(
  value: In,
  test: (value: In) => value is Out,
  message: (value: In) => string
): Out;
export function checked<Out extends In, In>(
  value: In,
  check: Check<Out, In>
): Out;
export function checked<Out extends In, In>(
  value: In,
  ...validator: [Check<Out, In>] | AdHocCheck<Out, In>
): Out {
  return Stack.entryPoint(() => {
    checkValue(value, checker(validator));
    return value;
  });
}

function checker<Out extends In, In>(
  checker: [Check<Out, In>] | AdHocCheck<Out, In>
): Check<Out, In> {
  if (checker.length === 1) {
    return checker[0];
  } else {
    const [test, failure] = checker;
    return { test, failure };
  }
}

function checkValue<In, Out extends In>(
  value: In,
  { test, failure }: Check<Out, In>
): asserts value is Out {
  if (!test(value)) {
    const error = typeof failure === "string" ? failure : failure(value);
    throw Error(error);
  }
}

// Avoid needing an additional import
export const UNINITIALIZED = Symbol.for("@starbeam/uninitialized");
export type UNINITIALIZED = typeof UNINITIALIZED;
