if (globalThis.Buffer === undefined) {
  const buffer = await import("buffer");
  globalThis.Buffer = buffer.Buffer;
}

export {};
