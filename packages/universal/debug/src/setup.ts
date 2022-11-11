if ((globalThis.Buffer as BufferConstructor | undefined) === undefined) {
  const buffer = await import("buffer");
  globalThis.Buffer = buffer.Buffer;
}

export {};
