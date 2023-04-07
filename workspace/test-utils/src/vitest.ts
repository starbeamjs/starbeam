import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  suite,
  test,
  vi,
} from "vitest";
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
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface JestAssertion<T = any> {
      // eslint-disable-next-line @typescript-eslint/method-signature-style
      toSatisfy<E extends T>(
        matcher: (value: E) => boolean,
        message?: string
      ): void;
    }
  }
}
