import { assert } from "@starbeam-workspace/test-utils";

const FRAME_START = "    at ";

export function callerFrame({
  extraFrames = 0,
}: {
  extraFrames?: number;
} = {}): string {
  try {
    throw Error("callerFrame");
  } catch (e) {
    assert(
      e instanceof Error && e.stack,
      `An Error instance thrown in the internals of callerFrame wasn't an Error instance when caught.`
    );

    const { stack } = parseStack(e.stack);
    const frame = stack[extraFrames + 1] ?? "";
    return frame.trimStart();
  }
}

/**
 * Get a stack trace from the current frame (**including** the current frame).
 */
export function getMyStack({ extra = 0 }: { extra?: number } = {}): string {
  try {
    throw Error("callerFrame");
  } catch (e) {
    assert(
      e instanceof Error && e.stack,
      `An Error instance thrown in the internals of callerFrame wasn't an Error instance when caught.`
    );

    return removeCaller(e.stack, { extra });
  }
}

/**
 * Get a stack trace from the current frame (**excluding** the current frame).
 */
export function callerStack({ extra = 0 }: { extra?: number } = {}): string {
  return getMyStack({ extra: 1 + extra });
}

export function removeCaller(
  errorStack: string,
  { extra = 0 }: { extra?: number } = {}
): string {
  const { header, stack } = parseStack(errorStack);

  return `${header.join("\n")}\n${stack.slice(1 + extra).join("\n")}`;
}

export function buildStack(header: string[], stack: string[]): string {
  return `${header.join("\n")}\n${stack.join("\n")}`;
}

export function parseStack(stack: string): {
  header: string[];
  stack: string[];
} {
  const lines = stack.split("\n");
  let headerDone = false;

  const headerLines = [];
  const stackLines = [];

  for (const line of lines) {
    if (headerDone) {
      stackLines.push(line);
    } else {
      if (line.startsWith(FRAME_START)) {
        headerDone = true;
        stackLines.push(line);
      } else {
        headerLines.push(line);
      }
    }
  }

  return { header: headerLines, stack: stackLines };
}
