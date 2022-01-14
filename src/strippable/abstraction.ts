import type { UnsafeAny } from "./wrapper";

export const FRAMES_TO_REMOVE = 3;
const FRAME_START = "    at ";

export let CURRENT_FRAMES_TO_REMOVE = FRAMES_TO_REMOVE;

export function abstraction<T>(callback: () => T): T {
  try {
    CURRENT_FRAMES_TO_REMOVE++;
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
      } else if (removed++ >= CURRENT_FRAMES_TO_REMOVE) {
        filtered.push(line);
      }
    }

    error.stack = filtered.join("\n");

    throw error;
  } finally {
    CURRENT_FRAMES_TO_REMOVE--;
  }
}
