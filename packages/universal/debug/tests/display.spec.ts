import { describeModule } from "@starbeam/debug";
import { describe, expect, test } from "vitest";

describe("Describing a source location", () => {
  test("getting the caller when the source is a package name", () => {
    const module = describeModule("@starbeam/debug");

    expect(module.display()).toBe("@starbeam/debug");

    expect(module.display({ loc: { line: 1, column: 1 } })).toBe(
      "@starbeam/debug:1:1"
    );

    expect(
      module.display({ loc: { line: 1, column: 1 }, action: "format" })
    ).toBe("format (@starbeam/debug:1:1)");
  });

  test("getting the caller when the source is a relative path", () => {
    const module = describeModule("./src/module.ts");

    expect(module.display()).toBe("./src/module.ts");

    expect(module.display({ loc: { line: 1, column: 1 } })).toBe(
      "./src/module.ts:1:1"
    );

    expect(
      module.display({ loc: { line: 1, column: 1 }, action: "format" })
    ).toBe("format (./src/module.ts:1:1)");
  });

  test("getting the caller when the source is an absolute relative path", () => {
    const module = describeModule("/workspaces/app/src/module.ts");

    expect(module.display()).toBe("/workspaces/app/src/module.ts");
    expect(module.display({}, { root: "/workspaces/app" })).toBe(
      "src/module.ts"
    );
    expect(module.display({}, { roots: { app: "/workspaces/app" } })).toBe(
      "[app]/src/module.ts"
    );

    expect(
      module.display(
        { loc: { line: 1, column: 1 } },
        { root: "/workspaces/app" }
      )
    ).toBe("src/module.ts:1:1");

    expect(
      module.display(
        { loc: { line: 1, column: 1 } },
        { roots: { app: "/workspaces/app" } }
      )
    ).toBe("[app]/src/module.ts:1:1");

    expect(
      module.display(
        { loc: { line: 1, column: 1 }, action: "format" },
        { root: "/workspaces/app" }
      )
    ).toBe("format (src/module.ts:1:1)");

    expect(
      module.display(
        { loc: { line: 1, column: 1 }, action: "format" },
        { roots: { app: "/workspaces/app" } }
      )
    ).toBe("format ([app]/src/module.ts:1:1)");
  });
});
