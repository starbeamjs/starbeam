import type { PartialVerifyContext } from "./assert.js";
import type { FinalizedContext, VerifyContext } from "./verify-context.js";

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
