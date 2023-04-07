export {
  type TestResourceImpl,
  resources,
  TestResource,
} from "./src/test-resource.js";
export { assert, UNINITIALIZED } from "./src/utils.js";
export {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  suite,
  test,
  vi,
} from "./src/vitest.js";
export type { TestAPI } from "vitest";
