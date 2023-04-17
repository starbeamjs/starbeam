import type {
  CallerStackFn,
  DescFn,
  DescriptionDetails,
  Runtime,
  TagSnapshot,
} from "@starbeam/interfaces";
import { isPresent, verified } from "@starbeam/verify";

export const CONTEXT = {
  runtime: null as null | Runtime,
};

export function defineRuntime(runtime: Runtime): void {
  CONTEXT.runtime = runtime;
}

function getRuntime(): Runtime {
  if (import.meta.env.DEV) {
    if (CONTEXT.runtime === null) {
      throw Error(
        "@starbeam/reactive requires a reactive runtime, but no runtime was registered (did you try to use @starbeam/reactive without @starbeam/runtime or @starbeam/universal?)"
      );
    }
  }

  return verified(CONTEXT.runtime, isPresent);
}

export const UNKNOWN_REACTIVE_VALUE = "{unknown reactive value}";

export const RUNTIME = {
  mark: (...args) => void getRuntime().mark(...args),
  update: (...args) => void getRuntime().update(...args),
  start: (...args) => getRuntime().start(...args),
  consume: (...args) => void getRuntime().consume(...args),
  subscribe: (...args) => getRuntime().subscribe(...args),
  link: (...args) => getRuntime().link(...args),
  finalize: (...args) => void getRuntime().finalize(...args),
  onFinalize: (...args) => getRuntime().onFinalize(...args),

  get debug() {
    return getRuntime().debug;
  },
} satisfies Runtime;

export const DEBUG = new (class DebugImpl {
  get Desc(): DescFn | undefined {
    return getRuntime().debug?.desc;
  }

  get callerStack(): CallerStackFn | undefined {
    return getRuntime().debug?.callerStack;
  }

  readonly describe = (description: DescriptionDetails | undefined): string => {
    if (description) {
      return (
        getRuntime().debug?.describe(description) ?? UNKNOWN_REACTIVE_VALUE
      );
    } else {
      return UNKNOWN_REACTIVE_VALUE;
    }
  };
})();

export function evaluate<T>(compute: () => T): { value: T; tags: TagSnapshot } {
  const done = RUNTIME.start();
  const value = compute();
  const tags = done();
  return { value, tags };
}
