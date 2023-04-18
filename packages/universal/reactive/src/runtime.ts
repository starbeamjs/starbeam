import type { DebugRuntime, Runtime, TagSnapshot } from "@starbeam/interfaces";
import { isPresent, verified } from "@starbeam/verify";

export const CONTEXT = {
  runtime: null as null | Runtime,
  debug: null as null | DebugRuntime,
};

export function defineRuntime(runtime: Runtime): void {
  CONTEXT.runtime = runtime;
}

export let defineDebug = (debug: DebugRuntime): void => {
  CONTEXT.debug = debug;
};

export function getRuntime(): Runtime {
  if (import.meta.env.DEV) {
    if (CONTEXT.runtime === null) {
      throw Error(
        "@starbeam/reactive requires a reactive runtime, but no runtime was registered (did you try to use @starbeam/reactive without @starbeam/runtime or @starbeam/universal?)"
      );
    }
  }

  return verified(CONTEXT.runtime, isPresent);
}

export const getDebug = (): DebugRuntime | undefined => {
  return CONTEXT.debug ?? undefined;
};

export const UNKNOWN_REACTIVE_VALUE = "{unknown reactive value}";

export let DEBUG: DebugRuntime | undefined;

if (import.meta.env.DEV) {
  defineDebug = (debug) => {
    CONTEXT.debug = debug;
    DEBUG = debug;
  };
}

export function evaluate<T>(compute: () => T): { value: T; tags: TagSnapshot } {
  const done = getRuntime().start();
  const value = compute();
  const tags = done();
  return { value, tags };
}
