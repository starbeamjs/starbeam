import type { Runtime } from "@starbeam/interfaces";

export const CONTEXT = {
  runtime: null as null | Runtime,
};

export function defineRuntime(runtime: Runtime): void {
  CONTEXT.runtime = runtime;
}

export function getRuntime(): Runtime {
  if (import.meta.env.DEV) {
    if (CONTEXT.runtime === null) {
      throw Error(
        "@starbeam/reactive requires a reactive runtime, but no runtime was registered (did you try to use @starbeam/reactive without @starbeam/universal?)"
      );
    }
  }

  return CONTEXT.runtime as Runtime;
}
