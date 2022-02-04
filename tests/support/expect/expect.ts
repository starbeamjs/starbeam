import { Abstraction, ReactiveMetadata } from "starbeam";
import { toBe } from "./patterns.js";
import {
  Failure,
  JestReporter,
  PatternDetails,
  Reporter,
  Success,
  ValueDescription,
} from "./report.js";

export const Dynamism = {
  constant: ReactiveMetadata.Constant,
  dynamic: ReactiveMetadata.Dynamic,
} as const;

export class Expects {
  static get dynamic(): Expects {
    return new Expects(ReactiveMetadata.Dynamic, null);
  }

  static get constant(): Expects {
    return new Expects(ReactiveMetadata.Constant, null);
  }

  static html(content: string): Expects {
    return new Expects(null, content);
  }

  readonly #dynamism: ReactiveMetadata | null;
  readonly #html: string | null;

  private constructor(dynamism: ReactiveMetadata | null, html: string | null) {
    this.#dynamism = dynamism;
    this.#html = html;
  }

  html(contents: string): Expects {
    return new Expects(this.#dynamism, contents);
  }

  get dynamism(): ReactiveMetadata | null {
    return this.#dynamism;
  }

  get contents(): string | null {
    return this.#html;
  }

  assertDynamism(actual: ReactiveMetadata): void {
    if (this.#dynamism !== null) {
      expect(
        value(actual).as("dynamism"),
        toBe(this.#dynamism, (value) => value.describe())
      );
    }
  }

  assertContents(actual: string): void {
    if (this.#html === null) {
      return;
    }

    Abstraction.wrap(() => {
      expect(actual, toBe(this.#html));
    });
  }
}

export type PatternResult<F = unknown, S = void> =
  | PatternMatch<S>
  | PatternMismatch<F>;

export interface PatternMatch<T> {
  type: "match";
  value: T;
}

export function PatternMatch<S>(value: S): PatternMatch<S>;
export function PatternMatch(): PatternMatch<undefined>;
export function PatternMatch(value?: unknown): PatternMatch<unknown> {
  return { type: "match", value };
}

export interface PatternMismatch<T> {
  type: "mismatch";
  value: T;
}

export function PatternMismatch<F>(value: F): PatternMismatch<F>;
export function PatternMismatch(): PatternMismatch<undefined>;
export function PatternMismatch(value?: unknown): PatternMismatch<unknown> {
  return { type: "mismatch", value };
}

export interface Pattern<In, Out extends In, F = unknown, S = void> {
  readonly details: PatternDetails;
  check(actual: Described<In>): PatternResult<F, S>;
  success(actual: Out, success: S): Success;
  failure(actual: Described<In>, failure: F): Failure;
}

export interface PatternDSL<In, Out extends In, F = unknown, S = void>
  extends Pattern<In, Out, F, S> {
  when(scenario: string): PatternDSL<In, Out, F, S>;
}

export type AnyPatternDSL<In, Out extends In = In> = PatternDSL<In, Out>;

export type PatternFor<P extends Pattern<unknown, unknown, unknown, unknown>> =
  P extends Pattern<infer In, infer Out, infer F, infer S>
    ? PatternImpl<In, Out, F, S>
    : never;

export class PatternImpl<In, Out extends In, F = unknown, S = void>
  implements PatternDSL<In, Out, F, S>
{
  static of<In, Out extends In, F, S>(
    pattern: Pattern<In, Out, F, S>
  ): PatternImpl<In, Out, F, S> {
    return new PatternImpl(pattern, undefined);
  }

  #pattern: Pattern<In, Out, F, S>;
  #scenario: string | undefined;

  private constructor(
    pattern: Pattern<In, Out, F, S>,
    scenario: string | undefined
  ) {
    this.#pattern = pattern;
    this.#scenario = scenario;
  }

  get details(): PatternDetails {
    return { ...this.#pattern.details, scenario: this.#scenario };
  }

  when(scenario: string): PatternImpl<In, Out, F, S> {
    return new PatternImpl(this.#pattern, scenario);
  }

  check(actual: Described<In>): PatternResult<F, S> {
    return this.#pattern.check(actual);
  }

  success(actual: Out, success: S): Success {
    return this.#pattern.success(actual, success);
  }

  failure(actual: Described<In>, failure: F): Failure {
    let outcome = this.#pattern.failure(actual, failure);
    return {
      ...outcome,
      pattern: {
        ...outcome.pattern,
        scenario: outcome.pattern.scenario ?? this.#scenario,
      },
    };
  }

  typecheck(_actual: In, state: PatternResult<S, F>): _actual is Out {
    return state.type === "match";
  }

  // abstract success(checked: S): Success;
  // abstract failure(actual: Out, checked: F): Failure;
}

export type AnyPattern<In, Out extends In = In> = Pattern<In, Out>;

// export interface Pattern<In, Out extends In> {
//   check(actual: In): unknown;
//   typecheck(actual: In, checked: ReturnType<this["check"]>): actual is Out;
//   success(actual: Out): Success;
//   failure(actual: In): Failure;
// }

export class Expectations {
  #reporter: Reporter;

  constructor(reporter: Reporter) {
    this.#reporter = reporter;
  }

  expect<In, Out extends In>(
    actual: Described<In>,
    pattern: AnyPattern<In, Out>
  ): void {
    let checked = pattern.check(actual);

    if (checked.type === "match") {
      this.#reporter.success(
        pattern.success(checked.value as unknown as Out, checked.value)
      );
    } else {
      this.#reporter.failure(pattern.failure(actual, checked.value));
    }
  }
}

export class Described<T> {
  static create<T>(value: T, description?: string): Described<T> {
    return new Described(value, description);
  }

  static is<T>(value: unknown): value is Described<T> {
    return (
      typeof value === "object" && value !== null && value instanceof Described
    );
  }

  static from<T>(value: T | Described<T>): Described<T> {
    if (Described.is(value)) {
      return value;
    } else {
      return new Described(value);
    }
  }

  private constructor(readonly value: T, readonly description?: string) {}

  as(description: string): Described<T> {
    return new Described(this.value, description);
  }

  toValueDescription(): ValueDescription {
    return ValueDescription(this.value, this.description);
  }
}

export type IntoDescribed<T> = T | Described<T>;

export const value = Described.create;

class Scenario {
  static of(when: string): Scenario {
    return new Scenario(when);
  }

  readonly #when: string;

  private constructor(when: string) {
    this.#when = when;
  }

  get when(): string {
    return this.#when;
  }
}

export function when(scenario: string): Scenario {
  return Scenario.of(scenario);
}

type ExpectArgsWithScenario<In, Out extends In> = [
  scenario: Scenario,
  actual: IntoDescribed<In>,
  pattern: AnyPatternDSL<In, Out>
];

type ExpectArgs<In, Out extends In> =
  | [actual: IntoDescribed<In>, pattern: AnyPatternDSL<In, Out>]
  | ExpectArgsWithScenario<In, Out>;

function hasScenario(
  args: ExpectArgs<unknown, unknown>
): args is ExpectArgsWithScenario<unknown, unknown> {
  return args[0] instanceof Scenario;
}

function expectPattern<In, Out extends In>(
  actual: IntoDescribed<In>,
  pattern: AnyPatternDSL<In, Out>
): asserts actual is Out;
function expectPattern<In, Out extends In>(
  scenario: Scenario,
  actual: IntoDescribed<In>,
  pattern: AnyPatternDSL<In, Out>
): asserts actual is Out;
function expectPattern<In, Out extends In>(...args: ExpectArgs<In, Out>): void {
  if (hasScenario(args)) {
    let [scenario, actual, pattern] = args;
    Abstraction.not(
      () =>
        new Expectations(new JestReporter()).expect(
          Described.from(actual),
          pattern.when(scenario.when)
        ),
      3
    );
  } else {
    let [actual, pattern] = args;
    Abstraction.not(
      () =>
        new Expectations(new JestReporter()).expect(
          Described.from(actual),
          pattern
        ),
      3
    );
  }
}

export const expect: typeof expectPattern = expectPattern;
