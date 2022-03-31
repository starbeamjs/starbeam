import type { UnsafeAny } from "./infer.js";

/**
 * @strip.noop
 */
export function assert(
  condition: UnsafeAny,
  info: string = "assertion error"
): asserts condition {
  assertCondition(condition, () => info);
}

export function failure(assumption: string): never {
  throw Error(`An assumption was wrong: ${assumption}`);
}

/** @internal */
export const assertCondition: (
  condition: UnsafeAny,
  info: () => string
) => asserts condition = (condition, info) => {
  if (condition === true) {
    return;
  }

  // eslint-disable-next-line no-debugger
  debugger;
  let message = `Unexpected: ${info()}`;
  console.assert(condition, message);
  throw Error(message);
};

export function exhaustive(_value: never, type?: string): never {
  if (type) {
    throw Error(`unexpected types left in ${type}`);
  } else {
    throw Error(`unexpected types left`);
  }
}
