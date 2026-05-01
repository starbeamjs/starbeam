import { defineDebug } from "@starbeam/reactive";

import debug from "./debug.js";

let setup: Promise<void> | undefined;

export async function setupDebug(): Promise<void> {
  setup ??= setupDebugOnce();

  return setup;
}

async function setupDebugOnce(): Promise<void> {
  if (!import.meta.env.DEV) return;

  if (
    (globalThis.Buffer as BufferConstructor | undefined) === undefined &&
    typeof require === "function"
  ) {
    try {
      // this is for CJS only, so require is the only option here

      const buffer = require("node:buffer") as { Buffer: BufferConstructor };
      globalThis.Buffer = buffer.Buffer;
    } catch {
      // ignore
    }
  } else {
    const buffer = await import("node:buffer");
    globalThis.Buffer = buffer.Buffer;
  }

  defineDebug(debug);
}
