import { defineDebug } from "@starbeam/reactive";

import debug from "./debug.js";

if (import.meta.env.DEV) {
  if (import.meta.env.ESM) {
    if ((globalThis.Buffer as BufferConstructor | undefined) === undefined) {
      const buffer = (await import("buffer")) as { Buffer: BufferConstructor };
      globalThis.Buffer = buffer.Buffer;
    }
  }

  defineDebug(debug);
}
