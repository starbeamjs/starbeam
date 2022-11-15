if (
  (globalThis.Buffer as BufferConstructor | undefined) === undefined &&
  typeof require === "function"
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
    const buffer = require("buffer");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    globalThis.Buffer = buffer.Buffer;
  } catch {
    // ignore
  }
}

if (typeof process === "undefined") {
  (globalThis as { process: object }).process = {};
}

export {};
