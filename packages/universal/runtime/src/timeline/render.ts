import type {
  CellTag,
  FormulaTag,
  NotifyReady,
  Tag,
  Tagged,
  Unsubscribe,
} from "@starbeam/interfaces";
import { isTagged } from "@starbeam/reactive";
import { UNINITIALIZED } from "@starbeam/shared";
import { getTag, hasDependencies, type Timestamp } from "@starbeam/tags";
import { NOW } from "@starbeam/tags";

import { RUNTIME } from "../define.js";
import { Subscriptions } from "./subscriptions.js";

export class ReactiveError extends Error {}

function SubscriptionRuntime(): {
  subscribe: (target: Tag, ready: NotifyReady) => Unsubscribe;
  mark: (cell: CellTag, update: (revision: Timestamp) => void) => void;
  update: (formula: FormulaTag) => void;
} {
  const subscriptions = Subscriptions.create();

  return {
    subscribe: (target: Tag, ready: NotifyReady): Unsubscribe => {
      if (target.dependencies === UNINITIALIZED || hasDependencies(target)) {
        return subscriptions.register(target, ready);
      } else {
        return () => void null;
      }
    },

    mark: (cell: CellTag, update: (revision: Timestamp) => void): void => {
      const revision = NOW.bump();
      update(revision);
      subscriptions.notify(cell);
    },

    update: (formula: FormulaTag): void => {
      subscriptions.update(formula);
    },
  };
}

export const SUBSCRIPTION_RUNTIME = SubscriptionRuntime();

export function render(tagged: Tagged | Tag, ready: NotifyReady): Unsubscribe {
  const tag = isTagged(tagged) ? getTag(tagged) : tagged;
  const unsubscribes = new Set<Unsubscribe>();
  unsubscribes.add(RUNTIME.subscribe(tag, ready));

  return () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}
