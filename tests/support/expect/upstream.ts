import { diff } from "jest-diff";
import * as starbeam from "../../../src/index";
import {
  ChildFailure,
  Failure,
  MatchResult,
  PatternDetails,
  ValueDescription,
} from "./report";

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
    return processResult(this, result);
  },
});

function processResult(
  ctx: jest.MatcherContext,
  result: MatchResult | ChildFailure<Failure>
): jest.CustomMatcherResult {
  if (result.success) {
    let message = () => hint(ctx.utils, result.pattern);

    return { message, pass: true };
  } else {
    if ("pattern" in result) {
      switch (result.kind) {
        case "equality":
        case "mismatch": {
          return notEqual(ctx, result);
        }

        case "multiple": {
          let { message, failures, pattern } = result;

          let output = () => {
            let out = [message, hint(ctx.utils, pattern)];

            for (let failure of failures) {
              let { message } = processResult(ctx, failure);
              out.push(message());
            }

            return out.join("\n\n");
          };

          return { message: output, pass: false };
        }

        case "invalid": {
          throw Error("todo: invalid");
        }

        case "wrong-type": {
          throw Error("todo: wrong-type");
        }

        default: {
          starbeam.exhaustive(result, "Failure");
        }
      }
    } else {
      switch (result.kind) {
        case "equality":
        case "mismatch": {
          if ("pattern" in result) {
            return notEqualChild(ctx, result);
          }
        }

        case "multiple": {
          throw Error("todo: multiple child of multiple");
        }

        case "invalid": {
          throw Error("todo: invalid child of multiple");
        }

        case "wrong-type": {
          throw Error("todo: wrong-type child of multiple");
        }

        default: {
          starbeam.exhaustive(result, "Failure");
        }
      }
    }
  }
}

function notEqual(
  ctx: jest.MatcherContext,
  {
    actual,
    expected,
    pattern,
  }: {
    actual: ValueDescription;
    expected: ValueDescription;
    pattern: PatternDetails;
  }
): jest.CustomMatcherResult {
  let message = () => {
    return (
      hint(ctx.utils, pattern) +
      "\n\n" +
      formatDiff(actual, expected, ctx.utils)
    );
  };

  return { message, pass: false };
}

function notEqualChild(
  ctx: jest.MatcherContext,
  {
    actual,
    expected,
    description,
  }: {
    actual: ValueDescription;
    expected: ValueDescription;
    description: string;
  }
): jest.CustomMatcherResult {
  let message = () => {
    return (
      ctx.utils.EXPECTED_COLOR(description) +
      "\n\n" +
      formatDiff(actual, expected, ctx.utils)
    );
  };

  return { message, pass: false };
}

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
