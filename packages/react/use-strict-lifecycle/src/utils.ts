export interface Check<Out extends In, In = unknown> {
  test: (value: In) => value is Out;
  failure: (value: In) => string;
}

export type CheckFn<Out extends In, In = unknown> = (
  value: In
) => Check<Out, In>;

export type AdHocCheck<Out extends In, In = unknown> = [
  predicate: (value: In) => value is Out,
  message: (value: In) => string
];

type OutValue<C extends CheckFn<In, In>, In> = C extends {
  test: (value: In) => value is infer Out extends In;
}
  ? Out
  : never;

export function checked<In, Out extends In, C extends CheckFn<Out, In>>(
  value: In,
  assertion: C
): OutValue<C, In> {
  check(value, assertion);
  return value;
}

export function check<In, Out extends In, C extends CheckFn<Out, In>>(
  value: In,
  assertion: C
): asserts value is OutValue<C, In> {
  const { test, failure } = assertion(value);
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

export function isInitialized<T>(
  _: T | UNINITIALIZED
): Check<T, T | UNINITIALIZED> {
  return {
    test: (value): value is T => value !== UNINITIALIZED,
    failure: (value) =>
      `Expected value to be initialized, but got ${String(value)}`,
  };
}

export function isDefined<T>(
  _: T | undefined | null
): Check<T, T | undefined | null> {
  return {
    test: (value): value is T => value !== undefined && value !== null,
    failure: (value) =>
      `Expected value to be defined, but got ${String(value)}`,
  };
}

export function mapEntries<R extends Record<string, unknown>, T>(
  record: R,
  callback: (value: R[keyof R], key: keyof R) => T
): { [K in keyof R]: T } {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      callback(value as R[keyof R], key),
    ])
  ) as { [K in keyof R]: T };
}

// Avoid needing an additional import
export const UNINITIALIZED = Symbol.for("starbeam.UNINITIALIZED");
export type UNINITIALIZED = typeof UNINITIALIZED;
