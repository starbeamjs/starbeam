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

  reset(): void {
    this.#events = [];
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

export function buildCause(
  caller: AnyFunction,
  message: string,
): (original?: Error | undefined) => Error | undefined {
  const source: { stack?: string } = {};

  if (Error.captureStackTrace) {
    Error.captureStackTrace(source, caller);
  }

  return (original) => {
    if (source.stack) {
      const error = new Error(message);
      error.stack = source.stack;

      if (!error.cause && original) error.cause = cloneError(original);
      return error;
    }
  };
}

export function withCause<T>(
  block: () => T,
  message: string,
  {
    entryFn,
  }: {
    entryFn: AnyFunction;
  },
): T {
  const cause = buildCause(entryFn, message);

  try {
    return block();
  } catch (e: unknown) {
    console.warn(e);
    let error;
    if (isAssertionError(e)) {
      error = e;
      console.log(error.stack);
      error.cause = cause();
    } else if (e instanceof Error) {
      error = e;
      error.cause = cause(error);
    } else {
      error = e;
    }

    throw error;
  }
}

function cloneError(error: Error): Error {
  const clone = new Error(error.message);
  if (error.stack) clone.stack = error.stack;
  if (error.cause) clone.cause = error.cause;
  return clone;
}

function wrapAssertion<T>(
  block: () => T,
  {
    entryFn = wrapAssertion,
    mapAssertion = (e) => e,
    mapAnyErr = (e) => e,
  }: {
    entryFn?: AnyFunction | undefined;
    mapAssertion?: (error: AssertionError) => AssertionError;
    mapAnyErr?: <E extends Error>(error: E) => E;
  },
): T {
  try {
    return block();
  } catch (e: unknown) {
    const buildCause = () => {
      if (e instanceof Error) {
        class Cause extends Error {}

        // We only need to get enough of a copy for the "cause" printing
        // in vitest, while also avoiding creating a circular reference.
        Object.defineProperty(Cause, "name", {
          configurable: true,
          value: e.name,
        });

        const cause = new Cause(e.message);

        if (e.stack !== undefined) {
          cause.stack = e.stack;
        }

        return cause;
      } else {
        return;
      }
    };

    const cause = buildCause();

    let error;
    if (isAssertionError(e) && mapAssertion) {
      error = removeAbstraction(mapAssertion(e), entryFn);
    } else if (e instanceof Error && mapAnyErr) {
      error = removeAbstraction(mapAnyErr(e), entryFn);
    } else {
      throw e;
    }

    error.cause = cause;

    throw error;
  }
}

export function entryPoint<const T>(
  block: () => T,
  {
    entryFn,
    cause: causeMessage,
  }: { entryFn: AnyFunction; cause?: string | undefined | null },
): T {
  const cause = causeMessage ? buildCause(entryFn, causeMessage) : undefined;

  return wrapAssertion(block, {
    mapAnyErr: (error) => {
      if (cause === null) {
        error.cause = undefined;
      } else if (cause) {
        error.cause = cause(error);
      }

      return error;
    },
    entryFn,
  });
}

export function isAssertionError(error: unknown): error is AssertionError {
  if (!error || !(error instanceof Error)) return false;

  return "showDiff actual expected operator"
    .split(" ")
    .every((property) => property in error);
}
