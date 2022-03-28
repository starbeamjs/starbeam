import { assert } from "./utils.js";

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
    return stack[1 + extraFrames].trimStart();
  }
}

/**
 * Get a stack trace from the current frame (**including** the current frame).
 */
export function getMyStack({ extra = 0 }: { extra?: number } = {}) {
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
  let lines = stack.split("\n");
  let headerDone = false;

  let headerLines = [];
  let stackLines = [];

  for (let line of lines) {
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

// function filter(frames: number, lines:string[]): Error {
//   let removed = 0;

//   let filtered: string[] = [];

//   for (let line of lines) {
//     if (!line.startsWith(FRAME_START)) {
//       filtered.push(line);
//     } else if (removed++ >= frames) {
//       filtered.push(line);
//     }
//   }

//   return filtered;
// }
