import type { Stack } from "./stack.js";
import { callerStack } from "./stack.js";

let STACK: Stack | null = null;
const CALLER_FRAME = 1;

export function entryPoint<T>(callback: () => T): T {
  // the outermost entry point wins.
  if (import.meta.env.DEV && !STACK) {
    try {
      STACK = callerStack(CALLER_FRAME);
      return callback();
    } finally {
      STACK = null;
    }
  } else {
    return callback();
  }
}
