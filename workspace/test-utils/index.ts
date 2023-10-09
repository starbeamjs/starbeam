import type { SuiteAPI } from "@vitest/runner";

import { describe } from "./src/vitest.js";

export type { AssertionError } from "./src/actions.js";
export {
  type AnyFunction,
  buildCause,
  entryPoint,
  isAssertionError,
  RecordedEvents,
  removeAbstraction,
  withCause,
} from "./src/actions.js";
export { TestResource } from "./src/test-resource.js";
export { assert, UNINITIALIZED } from "./src/utils.js";
export type { Assertion } from "./src/vitest.js";
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
} from "./src/vitest.js";
export type { TestAPI } from "@vitest/runner";

export const describeInDev: ReturnType<SuiteAPI["skipIf"]> = describe.skipIf(
  () => !!import.meta.env.PROD,
);
