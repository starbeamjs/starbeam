import { assert } from "@starbeam-workspace/test-utils";

const FRAME_START = "    at ";
const INITIAL_INTERNAL = 0;
const CALLER = 1;

export function callerFrame({
  internal = INITIAL_INTERNAL,
}: {
  internal?: number;
} = {}): string {
  try {
    throw Error("callerFrame");
  } catch (e) {
    assert(
      e instanceof Error && e.stack,
      `An Error instance thrown in the internals of callerFrame wasn't an Error instance when caught.`
    );

    const { stack } = parseStack(e.stack);
    const frame = stack[internal + CALLER] ?? "";
    return frame.trimStart();
  }
}

/**
 * Get a stack trace from the current frame (**including** the current frame).
 */
export function getMyStack({
  internal = INITIAL_INTERNAL,
}: { internal?: number } = {}): string {
  try {
    throw Error("callerFrame");
  } catch (e) {
    assert(
      e instanceof Error && e.stack,
      `An Error instance thrown in the internals of callerFrame wasn't an Error instance when caught.`
    );

    return removeCaller(e.stack, { internal: internal });
  }
}

/**
 * Get a stack trace from the current frame (**excluding** the current frame).
 */
export function callerStack({
  internal = INITIAL_INTERNAL,
}: { internal?: number } = {}): string {
  return getMyStack({ internal: CALLER + internal });
}

export function removeCaller(
  errorStack: string,
  { internal = INITIAL_INTERNAL }: { internal?: number } = {}
): string {
  const { header, stack } = parseStack(errorStack);

  return `${header.join("\n")}\n${stack.slice(CALLER + internal).join("\n")}`;
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
