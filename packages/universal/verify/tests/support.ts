import type { Expectation } from "@starbeam/verify";
import { VerificationError } from "@starbeam/verify";
import { expect } from "vitest";

interface ExpectationResult<T> {
  pass: boolean;
  message: () => string;
  actual?: T;
  expected?: T;
}

expect.extend({
  toFail: <T>(
    callback: (value: T) => void,
    value: T,
    expectation: Expectation
  ): ExpectationResult<unknown> => {
    try {
      callback(value);
      return {
        pass: false,
        message: () => `Expected the verification to fail`,
      };
    } catch (e) {
      if (e instanceof VerificationError) {
        const actual = e.message;

        const expected = expectation.message(value);

        const message = `Expected the verification to fail with ${JSON.stringify(
          expected
        )}`;

        if (actual === expected) {
          return {
            pass: true,
            message: () => message,
          };
        } else {
          return {
            pass: false,
            message: () => message,
            actual,
            expected,
          };
        }
      } else {
        return {
          pass: false,
          message: () =>
            `Expected the callback to fail with  to fail with ${expectation.message(
              e
            )}`,
          actual: e,
          expected: expectation,
        };
      }
    }
  },
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R = unknown> {
      toFail<T>(value: T, expectation: Expectation): R;
    }
  }
}
