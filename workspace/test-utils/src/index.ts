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

export const describeInDev: ReturnType<SuiteAPI["skipIf"]> = describe.skipIf(
  () => !!import.meta.env.PROD,
);
