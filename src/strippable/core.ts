import { Abstraction } from "./abstraction";
import type { PartialVerifyContext } from "./assert";
import type { FinalizedContext, VerifyContext } from "./verify-context";
import type { UnsafeAny } from "./wrapper";

/** @internal */
export const assertCondition: (
  condition: UnsafeAny,
  info: () => DebugInformation
) => asserts condition = abstractify((condition, info) => {
  if (condition === true) {
    return;
  }

  // eslint-disable-next-line no-debugger
  debugger;
  let message = `Unexpected: ${DebugInformation.message(info())}`;
  console.assert(condition, message);
  Abstraction.throw(message);
});

/**
 * @strip.noop
 */
export function assert(
  condition: UnsafeAny,
  info: DebugInformation = "assertion error"
): asserts condition {
  assertCondition(condition, () => info);
}

export function isVerifyContext(
  context: PartialVerifyContext
): context is VerifyContext {
  return typeof context.expected === "string";
}

export type DebugInformation = FinalizedContext | string;

export const DebugInformation = {
  message,
} as const;

function message(
  info: DebugInformation | undefined,
  defaultValue: DebugInformation
): string;
function message(info: DebugInformation): string;
function message(
  info: DebugInformation | undefined,
  defaultValue?: DebugInformation
): string {
  if (info === undefined) {
    return message(defaultValue as DebugInformation);
  } else if (typeof info === "string") {
    return info;
  } else {
    return info.message;
  }
}

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
