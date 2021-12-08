import { Failure, JestReporter, Reporter, Success } from "./report";

export enum Expects {
  dynamic = "dynamic",
  static = "static",
}

// export interface PatternMatch<T, Allowed> {
//   type: {
//     check(actual: unknown): actual is Allowed;
//     mismatch(actual: unknown): WrongType;
//   };
//   assert(actual: Allowed): MatchResult;
// }

export interface Pattern<In, Out extends In> {
  check(actual: In): actual is Out;
  success(actual: Out): Success;
  failure(actual: In): Failure;
}

export class Expectations {
  #reporter: Reporter;

  constructor(reporter: Reporter) {
    this.#reporter = reporter;
  }

  expect<In, Out extends In>(
    actual: In,
    pattern: In extends infer T
      ? Out extends T
        ? Pattern<T, Out>
        : never
      : never
  ): asserts actual is Out {
    if (pattern.check(actual)) {
      this.#reporter.success(pattern.success(actual));
    } else {
      this.#reporter.failure(pattern.failure(actual));
    }
  }
}

export const expect: Expectations["expect"] = (actual, pattern) =>
  new Expectations(new JestReporter()).expect(actual, pattern);
