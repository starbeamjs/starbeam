import type {
  CellTag,
  FormulaTag,
  SubscriptionRuntime,
  Tag,
  Tagged,
  Unsubscribe,
} from "@starbeam/interfaces";
import { getTag, type Timestamp } from "@starbeam/tags";
import { NOW } from "@starbeam/tags";

import { type NotifyReady, Subscriptions } from "./subscriptions.js";

enum Phase {
  read = "read",
  write = "write",
}

export class ReactiveError extends Error {}

/**
 * The Timeline is the core of the runtime.
 *
 * Subscribers use the Timeline to subscribe to notifications for specific
 * `Tagged` values. Reactive implementations that use `FormulaTag` are
 * responsible for notifying the timeline when their dependencies change.
 */
class Mutations implements SubscriptionRuntime {
  readonly #subscriptions = Subscriptions.create();
  readonly #lastPhase: Phase = Phase.read;

  subscribe(target: Tag, ready: NotifyReady): Unsubscribe {
    return this.#subscriptions.register(target, ready);
  }

  bump(cell: CellTag): { revision: Timestamp; notify: () => void } {
    return {
      revision: this.#updatePhase(Phase.write),
      notify: () => {
        this.#subscriptions.notify(cell);
      },
    };
  }

  update(formula: FormulaTag): void {
    this.#subscriptions.update(formula);
  }

  #updatePhase(phase: Phase): Timestamp {
    if (this.#lastPhase === phase) {
      return NOW.now;
    } else {
      return NOW.bump();
    }
  }
}

export const SUBSCRIPTION_RUNTIME = new Mutations();

export class PublicTimeline {
  readonly on = {
    change: (tagged: Tagged, ready: NotifyReady): Unsubscribe => {
      const unsubscribes = new Set<Unsubscribe>();
      for (const target of getTag(tagged).subscriptionTargets) {
        unsubscribes.add(SUBSCRIPTION_RUNTIME.subscribe(target, ready));
      }

      return () => {
        for (const unsubscribe of unsubscribes) {
          unsubscribe();
        }
      };
    },
  };

  get now(): Timestamp {
    return NOW.now;
  }
}

export const PUBLIC_TIMELINE = new PublicTimeline();
