/* eslint-disable @typescript-eslint/no-magic-numbers */
import { DEBUG }/*#__PURE__*/ from "@starbeam/debug";
import type { CallStack } from "@starbeam/interfaces";
import { describe, expect, test } from "vitest";

describe("Error stacks", () => {
  test.skipIf(() => import.meta.env.PROD)("getting the caller", () => {
    const anArrow = <T>(next: () => T): T => next();

    function aFunction(): string | undefined {
      return anOuterFunction()?.frames[0].action;
    }

    expect(anArrow(aFunction)).toEqual("aFunction");
    expect(anArrow(callerStackInArgs)).toEqual("anArrow");
  });
});

function anOuterFunction(): CallStack | undefined {
  return void DEBUG.callerStack();
}

function callerStackInArgs(
  desc = DEBUG.callerStack()?.frames[0].action,
): string | undefined {
  return desc;
}
