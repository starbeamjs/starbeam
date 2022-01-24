import { Abstraction, ReactiveMetadata } from "starbeam";
import { toBe } from "./patterns";
import {
  Failure,
  JestReporter,
  PatternDetails,
  Reporter,
  Success,
} from "./report";

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

  private constructor(dynamism: ReactiveMetadata, html: string | null) {
    this.#dynamism = dynamism;
    this.#html = html;
  }

  html(contents: string): Expects {
    return new Expects(this.#dynamism, contents);
  }

  get dynamism(): ReactiveMetadata {
    return this.#dynamism;
  }

  get contents(): string | null {
    return this.#html;
  }

  assertDynamism(actual: ReactiveMetadata): void {
    if (this.#dynamism !== null) {
      expect(
        actual,
        toBe(this.#dynamism, {
          actual: actual.describe(),
          expected: this.#dynamism.describe(),
        })
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
  check(actual: In): PatternResult<F, S>;
  success(actual: Out, success: S): Success;
  failure(actual: In, failure: F): Failure;
}

export type PatternFor<P extends Pattern<unknown, unknown, unknown, unknown>> =
  P extends Pattern<infer In, infer Out, infer F, infer S>
    ? PatternImpl<In, Out, F, S>
    : never;

export class PatternImpl<In, Out extends In, F = unknown, S = void> {
  static of<In, Out extends In, F, S>(
    pattern: Pattern<In, Out, F, S>
  ): PatternImpl<In, Out, F, S> {
    return new PatternImpl(pattern);
  }

  #pattern: Pattern<In, Out, F, S>;

  private constructor(pattern: Pattern<In, Out, F, S>) {
    this.#pattern = pattern;
  }

  get details(): PatternDetails {
    return this.#pattern.details;
  }

  check(actual: In): PatternResult<F, S> {
    return this.#pattern.check(actual);
  }

  success(actual: Out, success: S): Success {
    return this.#pattern.success(actual, success);
  }

  failure(actual: In, failure: F): Failure {
    return this.#pattern.failure(actual, failure);
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
    actual: In,
    pattern: AnyPattern<In, Out>
  ): asserts actual is Out {
    let checked = pattern.check(actual);

    if (checked.type === "match") {
      this.#reporter.success(
        pattern.success(checked.value as unknown as Out, checked.value)
      );
    } else {
      Abstraction.throws(() => {
        this.#reporter.failure(pattern.failure(actual, checked.value));
      });
    }
  }
}

export const expect: Expectations["expect"] = (actual, pattern) =>
  Abstraction.wrap(() =>
    new Expectations(new JestReporter()).expect(actual, pattern)
  );
