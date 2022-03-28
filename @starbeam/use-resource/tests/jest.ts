import "@testing-library/jest-dom/extend-expect";
import { buildStack, callerStack, parseStack } from "../src/description.js";

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
export function entryPoint<T>(
  callback: () => T,
  { extra = 0 }: { extra?: number } = {}
): T {
  const here = callerStack({ extra: extra + 2 });
  // console.log(here);

  try {
    return callback();
  } catch (e) {
    if (e && e instanceof Error && e.stack) {
      const { stack } = parseStack(here);
      const { header } = parseStack(e.stack);

      // console.log({ header, stack });

      e.stack = buildStack(header, stack);
    }

    throw e;
  }
}
