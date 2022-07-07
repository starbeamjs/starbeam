import { callerStack, isProd, Stack } from "@starbeam/debug";
import { describe, expect, test } from "vitest";

describe("Error stacks", () => {
  test.skipIf(() => isProd())("getting the caller", () => {
    const anArrow = <T>(next: () => T): T => next();

    function aFunction() {
      return anOuterFunction();
    }

    expect(anArrow(aFunction).caller?.display).toMatch(/^aFunction \([^)]*\)/);
    expect(anArrow(describeCallerInArgs)).toMatch(/^anArrow \([^)]*\)/);
  });
});

function anOuterFunction() {
  return callerStack();
}

function describeCallerInArgs(desc = Stack.describeCaller()) {
  return desc;
}
