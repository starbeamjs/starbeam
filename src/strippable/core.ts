import type { PartialVerifyContext } from "./assert";
import type { FinalizedContext, VerifyContext } from "./verify-context";
import type { UnsafeAny } from "./wrapper";

/**
 * @strip.noop
 */
export function assert(
  condition: UnsafeAny,
  info: DebugInformation = "assertion error"
): asserts condition {
  if (condition === false) {
    // eslint-disable-next-line no-debugger
    debugger;
    let message = `Unexpected: ${DebugInformation.message(info)}`;
    console.assert(condition, message);
    throw Error(message);
  }
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
