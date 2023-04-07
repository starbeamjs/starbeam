import { debugRuntime as DEBUG_RUNTIME } from "@starbeam/debug";
import type {
  AutotrackingRuntime,
  CallerStackFn,
  DebugRuntime,
  DescriptionRuntime,
  Runtime as IRuntime,
  SubscriptionRuntime,
} from "@starbeam/interfaces";
import { defineRuntime } from "@starbeam/reactive";

import { SUBSCRIPTION_RUNTIME } from "./timeline/tracker.js";
import { AUTOTRACKING_RUNTIME } from "./tracking-stack.js";

class Runtime implements IRuntime {
  static default(): Runtime {
    return new Runtime(
      SUBSCRIPTION_RUNTIME,
      AUTOTRACKING_RUNTIME,
      DEBUG_RUNTIME
    );
  }

  static single(
    runtime: SubscriptionRuntime & AutotrackingRuntime & DebugRuntime
  ): Runtime {
    return new Runtime(runtime, runtime, runtime);
  }

  static create({
    subscriptions,
    autotracking,
    debug,
  }: {
    subscriptions: SubscriptionRuntime;
    autotracking: AutotrackingRuntime;
    debug: DebugRuntime;
  }): Runtime {
    return new Runtime(subscriptions, autotracking, debug);
  }

  readonly #subscriptions: SubscriptionRuntime;
  readonly #autotracking: AutotrackingRuntime;
  readonly #debug: DebugRuntime | undefined;

  private constructor(
    subscription: SubscriptionRuntime,
    autotracking: AutotrackingRuntime,
    debug: DebugRuntime | undefined
  ) {
    this.#subscriptions = subscription;
    this.#autotracking = autotracking;
    this.#debug = debug;
  }

  get Desc(): DescriptionRuntime | undefined {
    return this.debug?.desc;
  }

  get callerStack(): CallerStackFn | undefined {
    return this.debug?.callerStack;
  }

  get debug(): DebugRuntime | undefined {
    return this.#debug;
  }

  get subscriptions(): SubscriptionRuntime {
    return this.#subscriptions;
  }

  get autotracking(): AutotrackingRuntime {
    return this.#autotracking;
  }
}

export const RUNTIME = Runtime.default();

defineRuntime(RUNTIME);
