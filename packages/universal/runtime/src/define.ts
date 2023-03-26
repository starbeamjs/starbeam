import { callerStack } from "@starbeam/debug";
import type {
  AutotrackingRuntime,
  Runtime as IRuntime,
  Stack,
  SubscriptionRuntime,
} from "@starbeam/interfaces";
import { defineRuntime } from "@starbeam/reactive";

import { TIMELINE } from "./timeline/api.js";
import { SUBSCRIPTION_RUNTIME } from "./timeline/tracker.js";
import { AUTOTRACKING_RUNTIME } from "./tracking-stack.js";

type Timeline = typeof TIMELINE;

class Runtime implements IRuntime {
  static default(): Runtime {
    return new Runtime(TIMELINE, SUBSCRIPTION_RUNTIME, AUTOTRACKING_RUNTIME);
  }

  static single(
    runtime: Timeline & SubscriptionRuntime & AutotrackingRuntime
  ): Runtime {
    return new Runtime(runtime, runtime, runtime);
  }

  static create({
    timeline,
    subscriptions,
    autotracking,
  }: {
    timeline: Timeline;
    subscriptions: SubscriptionRuntime;
    autotracking: AutotrackingRuntime;
  }): Runtime {
    return new Runtime(timeline, subscriptions, autotracking);
  }

  readonly #timeline: Timeline;
  readonly #subscriptions: SubscriptionRuntime;
  readonly #autotracking: AutotrackingRuntime;

  private constructor(
    timeline: Timeline,
    subscription: SubscriptionRuntime,
    autotracking: AutotrackingRuntime
  ) {
    this.#timeline = timeline;
    this.#subscriptions = subscription;
    this.#autotracking = autotracking;
  }

  get timeline(): Timeline {
    return this.#timeline;
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
