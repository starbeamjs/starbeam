import "@starbeam/debug-utils";
import { Stack } from "@starbeam/debug-utils";
import "@testing-library/jest-dom/extend-expect";

const jestExpect = expect as unknown as jest.Expect;
const jestTest = test;

export { jestExpect as expect, jestTest as test };

/**
 * Call a callback, and if the callback throws an exception, remove the current
 * frame and all of the frames invoked by the current frame from the call stack.
 *
 * In practice, this erases the abstraction from the call stack.
 *
 * If you want to erase additional **caller** frames (because the code that
 * calls the callback is not the direct call site from user code), you can
 * specify an additional number of frames to erase using the `extra` parameter.
 */
export function entryPoint<T>(callback: () => T): T {
  const caller = Stack.fromCaller();

  try {
    return callback();
  } catch (e) {
    Stack.updateError(e, (e) => {
      e.stack = caller.withHeader(Stack.from(e)).display;
    });

    throw e;
  }
}
