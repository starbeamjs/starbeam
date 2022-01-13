import type { UnsafeAny } from "./wrapper";

const FRAMES_TO_REMOVE = 3;
const FRAME_START = "    at ";

export function abstraction<T>(
  callback: () => T,
  frames = FRAMES_TO_REMOVE
): T {
  try {
    return callback();
  } catch (e) {
    let error: Error = e as UnsafeAny;

    if (error.stack === undefined) {
      throw Error(`Unexpected: missing error.stack`);
    }

    let lines = error.stack.split("\n");

    let removed = 0;

    let filtered: string[] = [];

    for (let line of lines) {
      if (!line.startsWith(FRAME_START)) {
        filtered.push(line);
      } else if (removed++ >= frames) {
        filtered.push(line);
      }
    }

    error.stack = filtered.join("\n");

    throw error;
  }
}
