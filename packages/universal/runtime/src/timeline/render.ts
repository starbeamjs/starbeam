import type {
  CellTag,
  FormulaTag,
  HasTag,
  NotifyReady,
  Tag,
  Tagged,
  Unsubscribe,
} from "@starbeam/interfaces";
import { isTagged } from "@starbeam/reactive";
import { getTag, NOW, type Timestamp } from "@starbeam/tags";

import { RUNTIME } from "../define.js";
import { Subscriptions } from "./subscriptions.js";

export class ReactiveError extends Error {}

function SubscriptionRuntime(): {
  subscribe: (target: HasTag, ready: NotifyReady) => Unsubscribe;
  mark: (cell: CellTag, update: (revision: Timestamp) => void) => void;
  update: (formula: FormulaTag) => void;
  next: () => Promise<void>;
} {
  const subscriptions = Subscriptions.create();

  return {
    subscribe: (target: HasTag, ready: NotifyReady): Unsubscribe => {
      return subscriptions.register(getTag(target), ready);
    },

    mark: (cell: CellTag, update: (revision: Timestamp) => void): void => {
      const revision = NOW.bump();
      update(revision);
      subscriptions.notify(cell);
    },

    update: (formula: FormulaTag): void => {
      subscriptions.update(formula);
    },

    next: async (): Promise<void> => {
      return subscriptions.next();
    },
  };
}

export const SUBSCRIPTION_RUNTIME = SubscriptionRuntime();

export function render(tagged: Tagged | Tag, ready: NotifyReady): Unsubscribe {
  const tag = isTagged(tagged) ? getTag(tagged) : tagged;
  const unsubscribes = new Set<NonNullable<Unsubscribe>>();
  const unsubscribe = RUNTIME.subscribe(tag, ready);
  if (unsubscribe) unsubscribes.add(unsubscribe);

  return () => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }
  };
}
