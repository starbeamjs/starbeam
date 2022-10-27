import { Pattern } from "@starbeam/core-utils";
import { describe, expect, test } from "vitest";

describe("regex utils", () => {
  test("a single pattern with positional matches", () => {
    const pattern = Pattern<[string | undefined]>(/(hello)/);

    expect([...pattern.match("hello")]).toEqual(["hello"]);
    expect([...pattern.match("goodbye")]).toEqual([]);

    const [hello] = pattern.match("hello");
    expect(hello).toBe("hello");

    const [goodbye] = pattern.match("goodbye");
    expect(goodbye).toBe(undefined);
  });

  test("a single pattern with mandatory positional matches", () => {
    const leadingWS = Pattern<[string]>(/^(\s*)/);

    expect([...leadingWS.match("hello")]).toEqual([""]);
    expect([...leadingWS.match(" goodbye")]).toEqual([" "]);
    expect([...leadingWS.match("  goodbye")]).toEqual(["  "]);

    const [noLeading] = leadingWS.match("hello");
    expect(noLeading).toBe("");

    const [oneLeading] = leadingWS.match(" goodbye");
    expect(oneLeading).toBe(" ");

    const [twoLeading] = leadingWS.match("  goodbye");
    expect(twoLeading).toBe("  ");
  });

  test("a single pattern with named matches", () => {
    const pattern = Pattern<{ hello?: string }>(/(?<hello>hello)/);

    expect(pattern.match("hello")).toEqual({ hello: "hello" });
    expect(pattern.match("goodbye")).toEqual({});
    expect(pattern.match("hello goodbye")).toEqual({ hello: "hello" });

    const { hello } = pattern.match("hello");
    expect(hello).toBe("hello");

    const { hello: goodbye } = pattern.match("goodbye");
    expect(goodbye).toBe(undefined);
  });

  test("a single pattern with mandatory named matches", () => {
    const leadingWS = Pattern<{ ws: string }>(/^(?<ws>\s*)/);
    expect(leadingWS.match("hello")).toEqual({ ws: "" });
    expect(leadingWS.match(" hello")).toStrictEqual({ ws: " " });
    expect(leadingWS.match("  hello")).toStrictEqual({ ws: "  " });

    const { ws: noWS } = leadingWS.match("hello");
    expect(noWS).toBe("");

    const { ws: oneWS } = leadingWS.match(" hello");
    expect(oneWS).toBe(" ");

    const { ws: twoWS } = leadingWS.match("  hello");
    expect(twoWS).toBe("  ");
  });
});
