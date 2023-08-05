import { getFirst } from "@starbeam/core-utils";

import { expect } from "./vitest.js";

export class RecordedEvents {
  static prefixed(prefix: string): RecordedEvents {
    const format: (event: string) => string = (event) => `${prefix}:${event}`;
    return new RecordedEvents(format);
  }

  #format: (event: string) => string;
  #events: string[] = [];

  constructor(format?: (event: string) => string) {
    this.#format = format ?? ((event) => event);
  }

  namedEvent(name: string): string {
    return this.#format(name);
  }

  prefixed(prefix: string): Pick<RecordedEvents, "record"> {
    return {
      record: (event: string) => {
        this.#events.push(this.#format(`${prefix}:${event}`));
      },
    };
  }

  readonly record = (event: string): void => {
    this.#events.push(this.#format(event));
  };

  expectEvents(expectedEvents: string[], message?: string | undefined): void {
    const actual = this.#events;
    this.#events = [];

    expect(actual, message).toStrictEqual(expectedEvents.map(this.#format));
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

export function removeAbstraction<E extends Error>(
  error: E,
  caller: AnyFunction,
): E {
  if (Reflect.has(Error, "captureStackTrace")) {
    Error.captureStackTrace(error, caller);
  }

  return error;
}

export function buildCause(caller: AnyFunction): Error | undefined {
  const source: { stack?: string } = {};

  if (Error.captureStackTrace) {
    Error.captureStackTrace(source, caller);
  }

  if (source.stack) {
    const error = new Error("Test function was defined here");
    error.stack = source.stack;
    return error;
  }
}

export function withCause<T>(block: () => T, caller: AnyFunction): T {
  const cause = buildCause(caller);

  try {
    return block();
  } catch (e: unknown) {
    let error;
    if (isAssertionError(e)) {
      error = removeAbstraction(e, withCause);
      console.log(error.stack);
      error.cause = cause;
    } else {
      error = e;
    }

    throw error;
  }
}

export function wrapAssertion<T>(
  block: () => T,
  then: (error: AssertionError) => AssertionError,
  { entryFn = wrapAssertion }: { entryFn?: AnyFunction | undefined } = {},
): T {
  try {
    return block();
  } catch (e: unknown) {
    let error;
    if (isAssertionError(e)) {
      error = then(removeAbstraction(e, entryFn));
    } else if (e instanceof Error) {
      error = removeAbstraction(e, entryFn);
    } else {
      error = e;
    }

    throw error;
  }
}

export function entryPoint<T>(
  block: () => T,
  { entryFn, cause }: { entryFn: AnyFunction; cause?: Error | undefined },
): T {
  return wrapAssertion(
    block,
    (error) => {
      if (cause) {
        error.cause = cause;
      }

      return error;
    },
    { entryFn },
  );
}

export function isAssertionError(error: unknown): error is AssertionError {
  if (!error || !(error instanceof Error)) return false;

  return "showDiff actual expected operator"
    .split(" ")
    .every((property) => property in error);
}
