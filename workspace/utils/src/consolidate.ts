import type { JsonObject } from "@starbeam-workspace/json";
import {
  type AbstractReporter,
  fragment,
  type IntoFragment,
} from "@starbeam-workspace/reporter";
import { Result } from "@starbeam-workspace/shared";

import { fallible } from "./fallible.js";

export const consolidate = fallible((object: JsonObject, parent: string) => {
  const existing = object[parent];

  if (existing) {
    if (Array.isArray(object[parent])) {
      return Result.err(
        fragment`Attempted to consolidate the ${parent} key into an object but it's already an array.`,
      );
    } else if (typeof existing !== "object") {
      return Result.err(
        fragment`Attempted to consolidate the ${parent} key into an object but it's already a ${typeof existing}.`,
      );
    }
  }

  const consolidated = (existing ?? {}) as JsonObject;
  const output = { [parent]: consolidated } as JsonObject;

  for (const [key, value] of Object.entries(object)) {
    if (key.startsWith(`${parent}:`)) {
      const [, ...rest] = key.split(":");
      const childKey = rest.join(":");
      consolidated[childKey] = value;
    } else {
      output[key] = value;
    }
  }

  return Result.ok(output);
});

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  type ReportedError = Error | IntoFragment;

  class TestReporter implements AbstractReporter {
    constructor(readonly errors: ReportedError[] = []) {}
    readonly reportError = (error: ReportedError): void => {
      this.errors.push(error);
    };
  }

  test("consolidate flat keys", () => {
    const reporter = new TestReporter();

    expect(
      consolidate(
        {
          name: "hello",
          version: "1.0.0",
          "starbeam:source": "ts",
          "starbeam:type": "library:build-support",
        },
        "starbeam",
      ),
    ).toEqual(
      Result.ok({
        name: "hello",
        version: "1.0.0",
        starbeam: {
          source: "ts",
          type: "library:build-support",
        },
      }),
    );

    expect(reporter.errors).toEqual([]);
  });

  test("consolidate mixed keys", () => {
    const reporter = new TestReporter();

    expect(
      consolidate(
        {
          name: "hello",
          version: "1.0.0",
          "starbeam:source": "ts",
          starbeam: { type: "library:build-support" },
        },
        "starbeam",
      ),
    ).toEqual(
      Result.ok({
        name: "hello",
        version: "1.0.0",
        starbeam: {
          source: "ts",
          type: "library:build-support",
        },
      }),
    );

    expect(reporter.errors).toEqual([]);
  });

  test("consolidate non-object keys is an error", () => {
    const reporter = new TestReporter();

    expect(
      consolidate(
        {
          name: "hello",
          version: "1.0.0",
          "starbeam:source": "ts",
          starbeam: "not an object",
        },
        "starbeam",
      ),
    ).toEqual(
      Result.err(
        fragment`Attempted to consolidate the starbeam key into an object but it's already a string.`,
      ),
    );

    expect(consolidate({ starbeam: [] }, "starbeam")).toEqual(
      Result.err(
        fragment`Attempted to consolidate the starbeam key into an object but it's already an array.`,
      ),
    );
  });
}
