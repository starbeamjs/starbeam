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
  checkValue(value, checker(validator));
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
  checkValue(value, checker(validator));
  return value;
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

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw Error(message);
  }
}

export function exhaustive(_value: never, variable: string): never {
  throw Error(`Exhaustive check failed for ${variable}`);
}

// Avoid needing an additional import
export const UNINITIALIZED = Symbol.for("starbeam.UNINITIALIZED");
export type UNINITIALIZED = typeof UNINITIALIZED;
