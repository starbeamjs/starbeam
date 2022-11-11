import { callerStack } from "@starbeam/debug";
import type { Stack } from "@starbeam/interfaces";
import { describe, expect, test } from "vitest";

describe("Error stacks", () => {
  test.skipIf(() => import.meta.env.PROD)("getting the caller", () => {
    const anArrow = <T>(next: () => T): T => next();

    function aFunction(): Stack {
      return anOuterFunction();
    }

    expect(anArrow(aFunction).caller?.display()).toMatch(
      /^aFunction \([^)]*\)/
    );
    expect(anArrow(callerStackInArgs)).toMatch(/^anArrow \([^)]*\)/);
  });
});

function anOuterFunction(): Stack {
  return callerStack();
}

function callerStackInArgs(
  desc = callerStack().caller?.display()
): string | undefined {
  return desc;
}
