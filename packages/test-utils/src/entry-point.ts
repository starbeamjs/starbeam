import { Stack } from "@starbeam/debug";

/**
 * Erase an abstraction from the call stack so the test error points at the user code, rather than
 * the abstraction's code.
 *
 * Call a callback, and if the callback throws an exception, remove the current frame and all of the
 * frames invoked by the current frame from the call stack.
 *
 * If you want to erase additional **caller** frames (because the code that calls the callback is
 * not the direct call site from user code), you can specify an additional number of frames to erase
 * using the `extra` parameter.
 */
export function entryPoint<T>(
  callback: () => T,
  { extra = 0 }: { extra?: number } = {}
): T {
  const stack = Stack.create(1 + extra);

  try {
    return callback();
  } catch (e) {
    const errorStack = Stack.from(e);

    if (errorStack) {
      Stack.replaceFrames(e, stack);
    }
    throw e;
  }
}
