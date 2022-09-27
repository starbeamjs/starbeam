import "./support.js";

import { expected, isEqual, isPresent, verify } from "@starbeam/verify";
import { describe, expect, test } from "vitest";

const isProd = import.meta.env.PROD;

describe.skipIf(isProd)("basic verification", () => {
  test("isPresent", () => {
    expect((value: unknown) => verify(value, isPresent)).toFail(
      null,
      expected.toBe("present")
    );
  });

  test("isEqual", () => {
    expect((value: unknown) => verify(value, isEqual(null))).toFail(
      undefined,
      expected.toBe("null").butGot("undefined")
    );
  });
});
