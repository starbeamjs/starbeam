import { callerStack } from "@starbeam/debug";
import type {
  AutotrackingRuntime,
  DebugRuntime,
  Runtime as IRuntime,
  Stack,
  SubscriptionRuntime,
} from "@starbeam/interfaces";
import { defineRuntime } from "@starbeam/reactive";

import { DEBUG_RUNTIME } from "./timeline/debug.js";
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
  readonly #debug: DebugRuntime;

  private constructor(
    subscription: SubscriptionRuntime,
    autotracking: AutotrackingRuntime,
    debug: DebugRuntime
  ) {
    this.#subscriptions = subscription;
    this.#autotracking = autotracking;
    this.#debug = debug;
  }

  get debug(): DebugRuntime {
    return this.#debug;
  }

  get subscriptions(): SubscriptionRuntime {
    return this.#subscriptions;
  }

  get autotracking(): AutotrackingRuntime {
    return this.#autotracking;
  }

  callerStack(): Stack {
    return callerStack();
  }
}

export const RUNTIME = Runtime.default();

defineRuntime(RUNTIME);
