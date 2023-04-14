if (
  (globalThis.Buffer as BufferConstructor | undefined) === undefined &&
  typeof require === "function"
) {
  try {
    const buffer = require("buffer");
    globalThis.Buffer = buffer.Buffer;
  } catch {
    // ignore
  }
}

export {};
