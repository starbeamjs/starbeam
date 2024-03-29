import { defineDebug } from "@starbeam/reactive";

import debug from "./debug.js";

if (import.meta.env.DEV) {
  if (
    (globalThis.Buffer as BufferConstructor | undefined) === undefined &&
    typeof require === "function"
  ) {
    try {
      // this is for CJS only, so require is the only option here
      // eslint-disable-next-line @typescript-eslint/no-var-requires
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
