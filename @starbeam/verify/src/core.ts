import type { PartialVerifyContext } from "./assert.js";
import type { VerifyContext } from "./verify-context.js";

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
