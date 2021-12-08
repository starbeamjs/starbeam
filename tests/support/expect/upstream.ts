import { exhaustive } from "../utils";
import { MatchResult, PatternDetails, ValueDescription } from "./report";
import { diff } from "jest-diff";

export default {
  expect,
} as const;

declare global {
  namespace jest {
    interface Matchers<R> {
      custom(): CustomMatcherResult;
    }
  }
}

expect.extend({
  custom(
    this: jest.MatcherContext,
    result: MatchResult
  ): jest.CustomMatcherResult {
    let options = {
      isNot: this.isNot,
      promise: this.promise,
    };

    if (result.success) {
      let message = () => hint(this.utils, result.pattern);

      return { message, pass: true };
    } else {
      switch (result.kind) {
        case "equality": {
          let { actual, expected } = result;

          let message = () => {
            return (
              hint(this.utils, result.pattern) +
              "\n\n" +
              formatDiff(actual, expected, this.utils)
            );
          };

          return { message, pass: false };
        }

        case "invalid": {
          throw Error("todo: invalid");
        }

        case "mismatch": {
          throw Error("todo: mismatch");
        }

        case "wrong-type": {
          throw Error("todo: wrong-type");
        }

        default: {
          exhaustive(result, "Failure");
        }
      }
    }
  },
});

function hint(
  utils: jest.MatcherUtils["utils"],
  pattern: PatternDetails
): string {
  return (
    utils.DIM_COLOR("expect(") +
    utils.RECEIVED_COLOR("actual") +
    utils.DIM_COLOR(", ") +
    pattern.name +
    utils.DIM_COLOR("(") +
    utils.EXPECTED_COLOR("expected") +
    utils.DIM_COLOR(`)) // ${pattern.description}`)
  );
}

// See: https://jestjs.io/docs/expect#thisutils
function formatDiff(
  actual: ValueDescription,
  expected: ValueDescription,
  utils: jest.MatcherUtils["utils"]
): string {
  let diffs = diff(expected.is, actual.is);

  if (diffs && diffs.includes("- Expect")) {
    return `Difference:\n\n${diffs}`;
  } else {
    let expectedString = utils.printExpected(expected.is);
    let actualString = utils.printReceived(actual.is);
    return `Expected: ${expectedString}\n\n  Actual: ${actualString}`;
  }
}
