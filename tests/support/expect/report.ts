import { abstraction } from "./abstraction";
import upstream from "./upstream";

export interface TypeDescription {
  kind: "type";
  is: string;
}

export function TypeDescription(value: string): TypeDescription {
  return {
    kind: "type",
    is: value,
  };
}

export interface ValueDescription {
  kind: "value";
  is: unknown;
  comment?: string;
}

export function ValueDescription(
  value: unknown,
  comment?: string
): ValueDescription {
  return {
    kind: "value",
    is: value,
    comment,
  };
}

export interface PatternDetails {
  name: string;
  description: string;
}

export interface TestOutcome {
  success: boolean;
  pattern: PatternDetails;
}

export interface Success extends TestOutcome {
  kind: "success";
  success: true;
  message: string;
}

export function Success({
  pattern,
  message,
}: {
  pattern: PatternDetails;
  message: string;
}): Success {
  return {
    kind: "success",
    success: true,
    pattern,
    message,
  };
}

export interface NotEqual extends TestOutcome {
  success: false;
  kind: "equality";
  expected: ValueDescription;
  actual: ValueDescription;
}

export function NotEqual({
  actual,
  expected,
  pattern,
}: {
  actual: unknown;
  expected: unknown;
  pattern: PatternDetails;
}): NotEqual {
  return {
    success: false,
    pattern,
    kind: "equality",
    expected: ValueDescription(expected),
    actual: ValueDescription(actual),
  };
}

export interface Mismatch extends TestOutcome {
  success: false;
  kind: "mismatch";
  description?: string;
  expected: ValueDescription;
  actual: ValueDescription;
}

type FailureArgs<F extends TestOutcome> = Omit<
  F,
  "success" | "kind" | "pattern"
>;
type TopLevelArgs<F extends TestOutcome> = FailureArgs<F> & {
  pattern: PatternDetails;
  description?: undefined;
};
type ChildArgs<F extends TestOutcome> = FailureArgs<F> & {
  pattern?: undefined;
  description: string;
};

export function Mismatch(args: TopLevelArgs<Mismatch>): Mismatch;
export function Mismatch(args: ChildArgs<Mismatch>): ChildFailure<Mismatch>;
export function Mismatch({
  actual,
  expected,
  description,
  pattern,
}: TopLevelArgs<Mismatch> | ChildArgs<Mismatch>):
  | Mismatch
  | ChildFailure<Mismatch> {
  return {
    success: false,
    pattern,
    kind: "mismatch",
    description,
    expected,
    actual,
  } as Mismatch | ChildFailure<Mismatch>;
}

export interface Invalid extends TestOutcome {
  success: false;
  kind: "invalid";
  message: string;
}

export function Invalid({
  message,
  pattern,
}: {
  message: string;
  pattern: PatternDetails;
}): Invalid {
  return {
    success: false,
    pattern,
    kind: "invalid",
    message,
  };
}

export interface WrongType extends TestOutcome {
  success: false;
  kind: "wrong-type";
  actual: ValueDescription | TypeDescription;
  expected: TypeDescription;
}

export function WrongType({
  actual,
  expected,
  pattern,
}: {
  actual: ValueDescription | TypeDescription;
  expected: string;
  pattern: PatternDetails;
}): WrongType {
  return {
    success: false,
    pattern,
    kind: "wrong-type",
    actual,
    expected: TypeDescription(expected),
  };
}

export interface Multiple extends TestOutcome {
  kind: "multiple";
  success: false;
  message: string;
  failures: readonly ChildFailure<Failure>[];
}

export type ChildFailure<T> = Omit<T, "pattern"> & {
  description: string;
};

export function Multiple({
  message,
  pattern,
  failures,
}: {
  message: string;
  pattern: PatternDetails;
  failures: readonly ChildFailure<Failure>[];
}): Multiple {
  return {
    success: false,
    pattern,
    kind: "multiple",
    message,
    failures,
  };
}

export type Failure = NotEqual | Invalid | Mismatch | WrongType | Multiple;
export type MatchResult = Success | Failure;

export interface Reporter {
  success(success: Success): void;
  failure(failure: Failure): never;
}

export function report(this: void, reporter: Reporter, result: Success): void;
export function report(this: void, reporter: Reporter, result: Failure): never;
export function report(
  this: void,
  reporter: Reporter,
  result: MatchResult
): void | never;
export function report(
  this: void,
  reporter: Reporter,
  result: MatchResult
): void | never {
  if (result.kind === "success") {
    reporter.success(result);
  } else {
    reporter.failure(result);
  }
}

export class JestReporter implements Reporter {
  success(success: Success): void {
    abstraction(() => upstream.expect(true, success.message).toBe(true), 5);
  }
  failure(failure: Failure): never {
    abstraction(() => upstream.expect(failure).custom(), 5);
    failed();
  }
}

function failed(): never {
  throw Error(
    `unexpected code execution after a Jest assertion should have failed`
  );
}
