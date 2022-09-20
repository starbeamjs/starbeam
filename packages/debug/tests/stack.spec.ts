import { callerStack } from "@starbeam/debug";
import { describe, expect, test } from "vitest";

describe("Error stacks", () => {
  test.skipIf(() => import.meta.env.PROD)("getting the caller", () => {
    const anArrow = <T>(next: () => T): T => next();

    function aFunction() {
      return anOuterFunction();
    }

    expect(anArrow(aFunction).caller?.display()).toMatch(
      /^aFunction \([^)]*\)/
    );
    expect(anArrow(callerStackInArgs)).toMatch(/^anArrow \([^)]*\)/);
  });
});

function anOuterFunction() {
  return callerStack();
}

function callerStackInArgs(desc = callerStack().caller?.display()) {
  return desc;
}
