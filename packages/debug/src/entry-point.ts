import { isDebug } from "./conditional.js";
import type { Stack } from "./stack.js";
import { callerStack } from "./stack.js";

let STACK: Stack | null = null;

export function entryPoint<T>(callback: () => T): T {
  // the outermost entry point wins.
  if (isDebug() && !STACK) {
    try {
      STACK = callerStack(1);
      return callback();
    } finally {
      STACK = null;
    }
  } else {
    return callback();
  }
}
