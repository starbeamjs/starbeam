/* eslint-disable @typescript-eslint/no-magic-numbers */
import { expect } from "@starbeam-workspace/test-utils";

export class Actions {
  #actions: string[] = [];

  record(action: string): void {
    this.#actions.push(action);
  }

  expect(...expected: string[] | [[]]): void {
    if (expected.length === 1 && Array.isArray(expected[0])) {
      expected = [];
    }

    const actual = this.#actions;
    this.#actions = [];

    try {
      expect(expected).toStrictEqual(actual);
    } catch (e: unknown) {
      if (isAssertionError(e)) {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        removeAbstraction(e, this.expect);
      }

      throw e;
    }
  }
}

interface AssertionOptions {
  showDiff: boolean;
  actual: unknown;
  expected: unknown;
  operator: string;
}

interface AssertionError extends Error, AssertionOptions {}

type AnyFunction = (...args: never[]) => unknown;

function removeAbstraction(error: AssertionError, caller: AnyFunction) {
  if (Error.captureStackTrace) {
    Error.captureStackTrace(error, caller);
  }
}

function isAssertionError(error: unknown): error is AssertionError {
  if (!error || !(error instanceof Error)) return false;

  return "showDiff actual expected operator"
    .split(" ")
    .every((property) => property in error);
}
