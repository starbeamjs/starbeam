import upstream from "./upstream";
import { exhaustive } from "../utils";

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
}

export function ValueDescription(value: unknown): ValueDescription {
  return {
    kind: "value",
    is: value,
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
  expected: string;
  actual: ValueDescription;
}

export function Mismatch({
  actual,
  expected,
  pattern,
}: {
  actual: string;
  expected: string;
  pattern: PatternDetails;
}): Mismatch {
  return {
    success: false,
    pattern,
    kind: "mismatch",
    expected,
    actual: ValueDescription(actual),
  };
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

export type Failure = NotEqual | Invalid | Mismatch | WrongType;
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
  if (result.success) {
    reporter.success(result);
  } else {
    reporter.failure(result);
  }
}

export class JestReporter implements Reporter {
  success(success: Success): void {
    upstream.expect(true, success.message).toBe(true);
  }
  failure(failure: Failure): never {
    upstream.expect(failure).custom();
    failed();
  }
}

function failed(): never {
  throw Error(
    `unexpected code execution after a Jest assertion should have failed`
  );
}
