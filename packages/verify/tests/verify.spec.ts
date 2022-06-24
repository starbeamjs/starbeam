import { expected, verify } from "@starbeam/verify";
import { describe, expect, test } from "vitest";

const isProd = import.meta.env.PROD;

describe.skipIf(isProd)("verify", () => {
  test("default verify message", () => {
    const isPresent = <T>(input: T | null | undefined): input is T => {
      return input !== null && input !== undefined;
    };

    const absent: string | null = null;

    expect(() => verify(absent, isPresent)).toThrowError(
      "Assumption was incorrect: isPresent"
    );
  });

  test("specified verify message", () => {
    const isPresent = <T>(input: T | null | undefined): input is T => {
      return input !== null && input !== undefined;
    };

    const absent: string | null = null;

    expect(() =>
      verify(
        absent,
        isPresent,
        expected("absent")
          .toBe("present")
          .butGot(() => String(absent))
      )
    ).toThrowError("Expected absent to be present, but got null");
  });

  test("merging verify message", () => {
    const isPresent = <T>(input: T | null | undefined): input is T => {
      return input !== null && input !== undefined;
    };

    expected.associate(isPresent, expected.toBe("present"));

    const absent: string | null = null;

    expect(() =>
      verify(
        absent,
        isPresent,
        expected("absent").butGot(() => String(absent))
      )
    ).toThrowError("Expected absent to be present, but got null");
  });

  test("adding a scenario", () => {
    const isPresent = <T>(input: T | null | undefined): input is T => {
      return input !== null && input !== undefined;
    };

    expected.associate(isPresent, expected.toBe("present"));

    const absent: string | null = null;

    expect(() =>
      verify(
        absent,
        isPresent,
        expected.when("some scenario").butGot(() => String(absent))
      )
    ).toThrowError(
      "When some scenario: Expected value to be present, but got null"
    );
  });
});
