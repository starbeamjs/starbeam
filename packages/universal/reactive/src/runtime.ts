import type {
  AutotrackingRuntime,
  CallerStackFn,
  DebugRuntime,
  DescriptionDetails,
  Runtime,
  SubscriptionRuntime,
  Tag,
} from "@starbeam/interfaces";

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

  return CONTEXT.runtime as Runtime;
}

export const UNKNOWN_REACTIVE_VALUE = "{unknown reactive value}";

type DescFn =
  typeof import("../../debug/src/description/debug/description.js")["Desc"];

class RuntimeImpl implements Runtime {
  get Desc(): DescFn | undefined {
    return (getRuntime().debug?.desc as DescFn) ?? undefined;
  }

  get callerStack(): CallerStackFn | undefined {
    return getRuntime().debug?.callerStack;
  }

  get subscriptions(): SubscriptionRuntime {
    return getRuntime().subscriptions;
  }

  get autotracking(): AutotrackingRuntime {
    return getRuntime().autotracking;
  }

  get debug(): DebugRuntime | undefined {
    return getRuntime().debug;
  }

  describe(description: DescriptionDetails | undefined): string {
    if (description) {
      return (
        getRuntime().debug?.describe?.(description) ?? UNKNOWN_REACTIVE_VALUE
      );
    } else {
      return UNKNOWN_REACTIVE_VALUE;
    }
  }

  evaluate<T>(compute: () => T): { value: T; tags: Set<Tag> } {
    const done = this.autotracking.start();
    const value = compute();
    const tags = done();
    return { value, tags };
  }
}

export const RUNTIME = new RuntimeImpl();
