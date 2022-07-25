import { callerStack, isErrorWithStack } from "@starbeam/debug";
import { expect } from "vitest";

export class Staleness {
  #stale = false;

  expect(staleness: "stale" | "fresh"): void;
  expect<T>(perform: () => T, staleness: "stale" | "fresh"): T;
  expect<T>(
    perform: (() => T) | "stale" | "fresh",
    staleness?: "stale" | "fresh"
  ): T | void {
    let result: T | undefined;
    let stale: "stale" | "fresh";
    if (typeof perform === "function") {
      result = perform();
      stale = staleness as "stale" | "fresh";
    } else {
      stale = perform;
    }

    const stack = callerStack();
    try {
      expect(this.#stale ? "stale" : "fresh").toBe(stale);
    } catch (e) {
      if (isErrorWithStack(e)) {
        const [errorHeader] = splitStack(e.stack);
        const [, callerStack] = splitStack(stack.stack);

        e.stack = `${errorHeader}\n${callerStack}`;
      }

      throw e;
    }
    this.#stale = false;
    return result;
  }

  invalidate(): void {
    this.#stale = true;
  }
}

function splitStack(stack: string): [string, string] {
  // find the first line that starts with "at" (with possible whitespace)
  const lines = stack.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("at ")) {
      return [lines.slice(0, i).join("\n"), lines.slice(i).join("\n")];
    }
  }

  return [stack, ""];
}
