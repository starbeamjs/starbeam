import type {
  CellTag,
  Diff,
  FormulaTag,
  NotifyReady,
  SubscriptionTarget,
  Tag,
} from "@starbeam/interfaces";
import { getTargets } from "@starbeam/tags";

import type { Unsubscribe } from "../lifetime/object-lifetime.js";
import { diff } from "./utils.js";

export interface Subscriptions {
  readonly register: (tag: Tag, ready: NotifyReady) => Unsubscribe;
  readonly notify: (cel: CellTag) => void;
  readonly update: (formula: FormulaTag) => void;
}

export function Subscriptions(): Subscriptions {
  const subscribers = SubscriberMap();
  const cells = CellMap();
  const tdzSubscriptions = new WeakMap<FormulaTag, Set<NotifyReady>>();

  function register(tag: Tag, ready: NotifyReady): Unsubscribe {
    const unsubscribes = getTargets(tag).map((t) => registerTarget(t, ready));

    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }

  function registerTarget(target: SubscriptionTarget, ready: NotifyReady) {
    if (target.type === "formula" && !target.initialized) {
      const set = upsertTdzSubscriptions(target, ready);

      // FIXME: Support removal after upgrade
      return () => {
        set.delete(ready);
      };
    } else {
      const entry = subscribers.register(target);
      cells.update({ add: new Set(target.dependencies()) }, entry);
      return entry.subscribe(ready);
    }
  }

  function upsertTdzSubscriptions(
    formula: FormulaTag,
    ready: NotifyReady
  ): Set<NotifyReady> {
    let subscriptions = tdzSubscriptions.get(formula);

    if (!subscriptions) {
      subscriptions = new Set();
      tdzSubscriptions.set(formula, subscriptions);
    }

    subscriptions.add(ready);
    return subscriptions;
  }

  function notify(cell: CellTag): void {
    cells.notify(cell);
  }

  function update(formula: FormulaTag): void {
    const subscriptions = tdzSubscriptions.get(formula);

    if (subscriptions) {
      for (const ready of subscriptions) {
        registerTarget(formula, ready);
      }
      tdzSubscriptions.delete(formula);
    }

    const { diff, entry } = subscribers.update(formula);
    cells.update(diff, entry);
  }

  return {
    register,
    notify,
    update,
  };
}

function SubscriberMap() {
  const mapping = new WeakMap<Tag, Entry>();

  function update(formula: FormulaTag): { diff: Diff<CellTag>; entry: Entry } {
    const entry = mapping.get(formula);

    if (entry) {
      return { diff: entry.update(formula), entry };
    } else {
      const entry = Entry(formula);
      mapping.set(formula, entry);
      return {
        diff: {
          add: new Set(formula.dependencies()),
          remove: new Set(),
        },
        entry,
      };
    }
  }

  function register(target: Tag) {
    let entry = mapping.get(target);

    if (!entry) {
      entry = Entry(target);
      mapping.set(target, entry);
    }

    return entry;
  }

  return { update, register };
}

interface Entry {
  readonly subscribe: (ready: NotifyReady) => Unsubscribe;
  readonly notify: (cell: CellTag) => void;
  readonly update: (formula: FormulaTag) => Diff<CellTag>;
}

function Entry(tag: Tag): Entry {
  let deps = new Set(tag.dependencies());
  const readySet = new Set<NotifyReady>();

  function subscribe(ready: NotifyReady): Unsubscribe {
    readySet.add(ready);
    return () => readySet.delete(ready);
  }

  function notify(cell: CellTag) {
    for (const ready of readySet) {
      ready(cell);
    }
  }

  function update(formula: FormulaTag) {
    const prev = deps;
    const next = new Set(formula.dependencies());
    deps = next;

    return diff(prev, next);
  }

  return { subscribe, notify, update };
}

/**
 * CellMap keeps track of the current subscriptions for a specific cell.
 *
 * When a mutation occurs, the `CellMap` knows exactly which subscriptions it needs to notify,
 * which keeps the mutation path simple.
 */
function CellMap() {
  const entriesMap = new WeakMap<CellTag, Set<Entry>>();

  function initialized(cell: CellTag): Set<Entry> {
    let entries = entriesMap.get(cell);

    if (!entries) {
      entries = new Set();
      entriesMap.set(cell, entries);
    }

    return entries;
  }

  // function register(cell: CellTag, entry: Entry): void {
  //   initialized(cell).add(entry);
  // }

  function update(diff: Partial<Diff<CellTag>>, entry: Entry): void {
    for (const cell of diff.add ?? []) {
      initialized(cell).add(entry);
    }

    for (const cell of diff.remove ?? []) {
      entriesMap.get(cell)?.delete(entry);
    }
  }

  function notify(cell: CellTag): void {
    const entries = entriesMap.get(cell);

    if (entries) {
      for (const entry of entries) {
        entry.notify(cell);
      }
    }
  }

  return { update, notify };
}
