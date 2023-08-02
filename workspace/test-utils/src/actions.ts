import { getFirst } from "@starbeam/core-utils";

import { expect } from "./vitest.js";

export class RecordedEvents {
  #events: string[] = [];

  record(event: string): void {
    this.#events.push(event);
  }

  expectEvents(expectedEvents: string[], message?: string | undefined): void {
    const actual = this.#events;
    this.#events = [];

    expect(actual, message).toStrictEqual(expectedEvents);
  }

  expect(...expected: string[] | [[]]): void {
    const expectedEvents =
      typeof getFirst(expected) === "string"
        ? (expected as string[])
        : ([] satisfies string[]);
    entryPoint(
      () => {
        this.expectEvents(expectedEvents);
      },
      { entryFn: this.expect },
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
  caller: AnyFunction,
): void {
  if (Reflect.has(Error, "captureStackTrace")) {
    Error.captureStackTrace(error, caller);
  }
}

export function entryPoint<T>(
  block: () => T,
  {
    entryFn: caller,
    cause,
  }: { entryFn: AnyFunction; cause?: Error | undefined },
): T {
  try {
    return block();
  } catch (e: unknown) {
    if (isAssertionError(e)) {
      removeAbstraction(e, caller);

      if (cause) {
        e.cause = cause;
      }
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
