import type { UnsafeAny } from "@starbeam/fundamental";
import { abstractify, Abstraction } from "./abstraction.js";

/** @internal */
export const assertCondition: (
  condition: UnsafeAny,
  info: () => string
) => asserts condition = abstractify((condition, info) => {
  if (condition === true) {
    return;
  }

  // eslint-disable-next-line no-debugger
  debugger;
  let message = `Unexpected: ${info()}`;
  console.assert(condition, message);
  Abstraction.throw(message);
});

/**
 * @strip.noop
 */
export function assert(
  condition: UnsafeAny,
  info: string = "assertion error"
): asserts condition {
  assertCondition(condition, () => info);
}
