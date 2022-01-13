import { assert } from "starbeam";

const FRAMES_TO_REMOVE = 3;
const FRAME_START = "    at ";

export function abstraction(
  callback: () => void,
  frames = FRAMES_TO_REMOVE
): void {
  try {
    callback();
  } catch (e) {
    let error: Error = e as Error;
    assert(error.stack);

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
