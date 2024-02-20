import type { PresentArray } from "@starbeam/core-utils";
import {
  dataGetter,
  defineObject,
  firstNItems,
  getFirst,
  isPresent,
  isPresentArray,
  mapArray,
} from "@starbeam/core-utils";
import type { CallStack, StackFrame } from "@starbeam/interfaces";
import { hasType, verified, verify } from "@starbeam/verify";
import StackTracey from "stacktracey";

import { parseModule } from "./module.js";

const INITIAL_INTERNAL_FRAMES = 1;
const CALLER = 1;

export const ABSTRACTION_FRAME = 1;

export function callerStack(
  internal = INITIAL_INTERNAL_FRAMES,
): CallStack | undefined {
  const ErrorClass = Error;

  if ("captureStackTrace" in ErrorClass) {
    const err = {} as { stack: string };
    ErrorClass.captureStackTrace(err, callerStack);
    return callStack(err.stack)?.slice(internal);
  } else {
    const stack = Error(
      "An error created in the internals of Stack.create",
    ).stack;

    verify(stack, hasType("string"));
    return callStack(stack)?.slice(internal + CALLER);
  }
}

function callStack(stack: string, nearby?: string): CallStack | undefined {
  const parsed = parseStack(stack);

  if (parsed === undefined) {
    return undefined;
  }

  const { header, entries, lines, trace } = parsed;

  const frames = mapArray(entries, (entry) =>
    stackFrame(() => trace.withSource(entry), nearby),
  );

  return {
    header,
    frames,
    slice: (n: number) => {
      const stack = lines.slice(n).join("\n");
      return callStack(`${header}\n${stack}`, nearby);
    },
  };
}

function stackFrame(
  reify: () => StackTracey.Entry,
  nearby: string | undefined,
): StackFrame {
  let reified: StackTracey.Entry | null = null;

  function getEntry(): StackTracey.Entry {
    if (!reified) reified = reify();
    return reified;
  }

  return defineObject({
    action: dataGetter(() => getEntry().callee),
    module: dataGetter(() => parseModule(getEntry().file, nearby)),
    loc: dataGetter(() => {
      const entry = getEntry();

      if (entry.line === undefined) return undefined;

      return {
        line: entry.line,
        column: entry.column,
      };
    }),
  });
}

const MISSING = -1;

interface ParsedStack {
  readonly header: string;
  readonly entries: PresentArray<StackTracey.Entry>;
  readonly lines: PresentArray<string>;
  readonly trace: StackTracey;
}

function parseStack(stack: string): ParsedStack | undefined {
  const trace = new StackTracey(stack);

  if (!isPresentArray(trace.items)) return undefined;

  const [firstFrame] = trace.items;

  const first = firstFrame.beforeParse;
  const lines = stack.split("\n");

  const offset = lines.findIndex((line) => line.trim() === first);

  if (offset === MISSING) {
    throw Error(
      `An assumption was incorrect: A line that came from StackTracey cannot be found in the original trace.\n\n== Stack ==\n\n${stack}\n\n== Line ==\n\n${first}`,
    );
  }

  const header = firstNItems(lines, offset).join("\n");
  const rest = lines.slice(offset);

  if (!isPresentArray(rest)) return undefined;

  return {
    header,
    entries: trace.items,
    lines: rest,
    trace,
  };
}

function isErrorWithStack(value: unknown): value is Error & { stack: string } {
  return hasType("object")(value) && hasType("string")((value as Error).stack);
}

if (import.meta.vitest) {
  const { test, expect, describe } = import.meta.vitest;
  const filename = new URL(import.meta.url).pathname;

  function anAction() {
    throw Error(ERROR_MESSAGE);
  }

  const ERROR_LOC = {
    line: 140,
    column: 11,
  };

  function aCallerAction() {
    return callerStack();
  }

  const ERROR_MESSAGE = "an error happened in an action";
  const CALLER_FRAME = 1;

  test("parseStack", () => {
    try {
      anAction();
    } catch (e) {
      const { header, entries, lines, trace } = verified(
        parseStack(verified(e, isErrorWithStack).stack),
        isPresent,
      );

      expect(header).toBe(`Error: ${ERROR_MESSAGE}`);
      expect(lines).toHaveLength(entries.length);
      expect(trace.items).toEqual(entries);
      expect(getFirst(lines)).toMatch(/\banAction\b/);
    }
  });

  {
    function testCallStack() {
      try {
        anAction();
      } catch (e) {
        const stack = verified(
          callStack(verified(e, isErrorWithStack).stack, filename),
          isPresent,
        );

        expect(stack.header).toBe(`Error: ${ERROR_MESSAGE}`);
        const frameSize = stack.frames.length;
        expect(stack.slice(CALLER_FRAME)?.frames).toHaveLength(
          frameSize - CALLER_FRAME,
        );

        const firstFrame = getFirst(stack.slice(CALLER_FRAME)?.frames ?? []);
        expect(firstFrame?.action).toBe(TEST_NAME);
      }
    }

    const TEST_NAME = testCallStack.name;

    test("callStack", testCallStack);
  }

  {
    function testCallerStack() {
      const caller = verified(aCallerAction(), isPresent);

      expect(getFirst(caller.frames).action).toBe(TEST_NAME);
    }

    const TEST_NAME = testCallerStack.name;

    test("callerStack", testCallerStack);
  }

  describe("StackFrame", () => {
    test("action", () => {
      try {
        anAction();
      } catch (e) {
        verify(e, isErrorWithStack);

        const trace = new StackTracey(e.stack);
        const first = verified(getFirst(trace.items), isPresent);

        const frame = stackFrame(() => trace.withSource(first), filename);

        expect(frame.action).toBe("anAction");
        expect(frame.module).toEqual({
          path: "stack.ts",
          root: new URL(".", import.meta.url).pathname,
        });
        expect(frame.loc).toEqual(ERROR_LOC);
      }
    });
  });
}
