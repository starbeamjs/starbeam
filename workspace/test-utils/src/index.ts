import type { SuiteAPI } from "@vitest/runner";

import { describe } from "./vitest.js";

export type { AssertionError } from "./actions.js";
export {
  type AnyFunction,
  buildCause,
  entryPoint,
  isAssertionError,
  RecordedEvents,
  removeAbstraction,
  withCause,
} from "./actions.js";
export { TestResource } from "./test-resource.js";
export { assert, UNINITIALIZED } from "./utils.js";
export type { Assertion } from "./vitest.js";
export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  custom,
  describe,
  expect,
  it,
  suite,
  test,
  vi,
} from "./vitest.js";
export type { TestAPI } from "@vitest/runner";

// Note: vitest 4 changed `describe.skipIf` to take a boolean value directly
// instead of a predicate function. Passing a function always truthy-evaluates
// to "skip" regardless of PROD.
export const describeInDev: ReturnType<SuiteAPI["skipIf"]> = describe.skipIf(
  !!import.meta.env.PROD,
);
