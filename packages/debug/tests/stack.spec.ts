import { Stack } from "@starbeam/debug";
import { describe, expect, test } from "vitest";

describe("Error stacks", () => {
  test("getting the caller", () => {
    const anArrow = <T>(next: () => T): T => next();

    function aFunction() {
      return anOuterFunction();
    }

    expect(anArrow(aFunction).caller?.display).toMatch(/^aFunction \([^)]*\)/);
    expect(anArrow(describeCallerInArgs)).toMatch(/^anArrow \([^)]*\)/);
  });
});

function anOuterFunction() {
  return Stack.fromCaller();
}

function describeCallerInArgs(desc = Stack.describeCaller()) {
  return desc;
}
