import type {
  Assertion,
  ExpectationResult,
  ExpectStatic,
  MatcherState,
} from "@vitest/expect";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  createExpect,
  describe,
  expect as vitestExpect,
  it,
  suite,
  test,
  vi,
} from "vitest";

export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  vitestExpect as expect,
  it,
  suite,
  test,
  vi,
};

export type { Assertion } from "@vitest/expect";

type CustomAssertion<T = any, U = any> = (
  actual: T,
  expected: U,
  state: MatcherState,
) => ExpectationResult;

type CustomAssertions = Record<string, CustomAssertion>;

type Extensions<C extends CustomAssertions, T> = {
  [K in keyof C as Extension<C, K, T>]: C[K] extends (
    actual: T,
    expected: infer U,
    state: any,
  ) => any
    ? (this: Assertion<T>, expected: U) => void
    : never;
};

type Extension<C extends CustomAssertions, K extends keyof C, T> = {
  [P in K]: C[K] extends (actual: T, expected: any, state: any) => any
    ? P
    : never;
}[K];

type ExpectStaticProps = {
  [P in keyof ExpectStatic]: ExpectStatic[P];
};

type CustomExpect<C extends CustomAssertions> = ExpectStaticProps & {
  <T>(actual: T, message?: string): Assertion<T> & Extensions<C, T>;
};

export function custom<const C extends CustomAssertions>(
  assertions: C,
): CustomExpect<C> {
  const expect = createExpect();

  for (const [name, assertion] of Object.entries(assertions)) {
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    function expectation(
      this: MatcherState,
      received: unknown,
      expected: unknown,
    ) {
      return assertion(received, expected, this);
    }

    expect.extend({
      [name]: expectation,
    });
  }

  return expect as CustomExpect<C>;
}
