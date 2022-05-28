import { describeModule } from "@starbeam/debug";
import { describe, expect, test } from "vitest";

describe("Describing a source location", () => {
  test("getting the caller when the source is a package name", () => {
    const module = describeModule("@starbeam/debug");

    expect(module.display()).toBe("at @starbeam/debug");

    expect(module.display({ loc: { line: 1, column: 1 } })).toBe(
      "at @starbeam/debug:1:1"
    );

    expect(
      module.display({ loc: { line: 1, column: 1 }, action: "format" })
    ).toBe("at format (@starbeam/debug:1:1)");
  });

  test("getting the caller when the source is a relative path", () => {
    const module = describeModule("packages/debug/src/module.ts");

    expect(module.display()).toBe("at packages/debug/src/module.ts");

    expect(module.display({ loc: { line: 1, column: 1 } })).toBe(
      "at packages/debug/src/module.ts:1:1"
    );

    expect(
      module.display({ loc: { line: 1, column: 1 }, action: "format" })
    ).toBe("at format (packages/debug/src/module.ts:1:1)");
  });
});
