import { getFirst } from "@starbeam/core-utils";

import { expect } from "./vitest.js";

export class Actions {
  #actions: string[] = [];

  record(action: string): void {
    this.#actions.push(action);
  }

  expectActions(expectedActions: string[], message?: string | undefined): void {
    const actual = this.#actions;
    this.#actions = [];

    expect(expectedActions, message).toStrictEqual(actual);
  }

  expect(...expected: string[] | [[]]): void {
    const expectedActions =
      typeof getFirst(expected) === "string"
        ? (expected as string[])
        : ([] satisfies string[]);
    entryPoint(
      () => {
        this.expectActions(expectedActions);
      },
      { entryFn: this.expect }
    );
  }
}

export interface AssertionOptions {
  showDiff: boolean;
  actual: unknown;
  expected: unknown;
  operator: string;
}

export interface AssertionError extends Error, AssertionOptions {}

export type AnyFunction = (...args: never[]) => unknown;

export function removeAbstraction(
  error: AssertionError,
  caller: AnyFunction
): void {
  if (Reflect.has(Error, "captureStackTrace")) {
    Error.captureStackTrace(error, caller);
  }
}

export function entryPoint<T>(
  block: () => T,
  { entryFn: caller }: { entryFn: AnyFunction }
): T {
  try {
    return block();
  } catch (e: unknown) {
    if (isAssertionError(e)) {
      removeAbstraction(e, caller);
    }

    throw e;
  }
}

export function isAssertionError(error: unknown): error is AssertionError {
  if (!error || !(error instanceof Error)) return false;

  return "showDiff actual expected operator"
    .split(" ")
    .every((property) => property in error);
}
