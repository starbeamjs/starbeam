/// <reference types="node" />

if (typeof process === "undefined") {
  // eslint-disable-next-line
  globalThis.process = {} as any;
}

export {};
