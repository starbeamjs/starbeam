import type {
  AutotrackingRuntime,
  DebugRuntime,
  Runtime,
  Stack,
  SubscriptionRuntime,
  Tag,
} from "@starbeam/interfaces";

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

class RuntimeImpl implements Runtime {
  callerStack(): Stack {
    return getRuntime().callerStack();
  }

  get subscriptions(): SubscriptionRuntime {
    return getRuntime().subscriptions;
  }

  get autotracking(): AutotrackingRuntime {
    return getRuntime().autotracking;
  }

  get debug(): DebugRuntime {
    return getRuntime().debug;
  }

  evaluate<T>(compute: () => T): { value: T; tags: Set<Tag> } {
    const done = this.autotracking.start();
    const value = compute();
    const tags = done();
    return { value, tags };
  }
}

export const RUNTIME = new RuntimeImpl();
