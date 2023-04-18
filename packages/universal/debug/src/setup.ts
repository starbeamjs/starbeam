import { defineDebug } from "@starbeam/reactive";

import debug from "./debug.js";

if (
  (globalThis.Buffer as BufferConstructor | undefined) === undefined &&
  typeof require === "function"
) {
  try {
    // this is for CJS only, so require is the only option here
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const buffer = require("buffer") as { Buffer: BufferConstructor };
    globalThis.Buffer = buffer.Buffer;
  } catch {
    // ignore
  }
}

defineDebug(debug);
