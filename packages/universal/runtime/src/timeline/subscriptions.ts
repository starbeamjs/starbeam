import type {
  CellTag,
  CoreFormulaTag,
  CoreSubscriptionTarget,
  CoreTag,
  Diff,
  FormulaTag,
  NotifyReady,
  Tag,
} from "@starbeam/interfaces";

import type { Unsubscribe } from "../lifetime/object-lifetime.js";
import { diff } from "./utils.js";

export class Subscriptions {
  static create(): Subscriptions {
    return new Subscriptions();
  }

  // A mappping from subscribed tags to their subscriptions
  readonly #tagSubscriptions = new LazyWeakMap<Tag, Subscription>(Subscription);
  // A mapping from the current dependencies of subscribed tags to their subscriptions
  readonly #cellSubscriptions = new WeakSetMap<CellTag, Subscription>();
  // A mapping from uninitialized formulas to notifications that should be
  // turned into subscriptions when the formula is initialized
  readonly #queuedSubscriptions = new WeakSetMap<CoreFormulaTag, NotifyReady>();

  register(tag: CoreTag, ready: NotifyReady): Unsubscribe {
    const targets = tag.targets;
    targets.forEach((t) => {
      this.#subscribe(t, ready);
    });

    return () => {
      for (const target of targets) {
        this.#unsubscribe(target, ready);
      }
    };
  }

  notify(cell: CellTag): void {
    for (const entry of this.#cellSubscriptions.get(cell)) {
      entry.notify(cell);
    }
  }

  update(formula: FormulaTag): void {
    // if there are any queued subscriptions, subscribe them now
    for (const ready of this.#queuedSubscriptions.drain(formula)) {
      this.#subscribe(formula, ready);
    }

    const subscription = this.#tagSubscriptions.get(formula);
    const diff = subscription.update(formula);

    // add the subscriptions to any new dependencies
    for (const cell of diff.add) {
      this.#cellSubscriptions.add(cell, subscription);
    }

    // remove the subscriptions from any removed dependencies
    for (const cell of diff.remove) {
      this.#cellSubscriptions.delete(cell, subscription);
    }
  }

  #unsubscribe(target: CoreSubscriptionTarget, ready: NotifyReady) {
    if (target.dependencies === undefined) {
      this.#queuedSubscriptions.delete(target, ready);
    } else {
      const subscription = this.#tagSubscriptions.get(target);
      subscription.unsubscribe(ready);
    }
  }

  #subscribe(tag: CoreSubscriptionTarget, ready: NotifyReady): void {
    const targets = tag.targets;

    for (const target of targets) {
      const deps = target.dependencies;

      if (deps === undefined) {
        this.#queuedSubscriptions.add(target, ready);
      } else {
        const subscription = this.#tagSubscriptions.get(target);

        // initialize the subscription with the current target's dependencies
        for (const cell of deps) {
          this.#cellSubscriptions.add(cell, subscription);
        }
  
        subscription.subscribe(ready);
      }  
    }
    const deps = tag.dependencies;

    if (deps === undefined) {
      this.#queuedSubscriptions.add(target, ready);
    } else {

    }

    if (target.type === "formula" && !target.initialized) {
      this.#queuedSubscriptions.add(target, ready);
    } else {
      const subscription = this.#tagSubscriptions.get(target);

      // initialize the subscription with the current target's dependencies
      for (const cell of target.dependencies()) {
        this.#cellSubscriptions.add(cell, subscription);
      }

      subscription.subscribe(ready);
      return;
    }
  }
}

interface Subscription {
  readonly subscribe: (ready: NotifyReady) => void;
  readonly unsubscribe: (ready: NotifyReady) => void;
  readonly notify: (cell: CellTag) => void;
  readonly update: (formula: FormulaTag) => Diff<CellTag>;
}

function Subscription(tag: Tag): Subscription {
  let deps = new Set(tag.dependencies());
  const readySet = new Set<NotifyReady>();

  function subscribe(ready: NotifyReady): Unsubscribe {
    readySet.add(ready);
    return () => readySet.delete(ready);
  }

  function unsubscribe(ready: NotifyReady): void {
    readySet.delete(ready);
  }

  function notify(cell: CellTag) {
    for (const ready of readySet) ready(cell);
  }

  function update(formula: FormulaTag) {
    const prev = deps;
    const next = new Set(formula.dependencies());
    deps = next;

    return diff(prev, next);
  }

  return { subscribe, unsubscribe, notify, update };
}

const EMPTY_SET = new Set();
const EMPTY_SIZE = 0;

class LazyWeakMap<K extends object, V> {
  readonly #create: (key: K) => V;
  readonly #map = new WeakMap<K, V>();

  constructor(create: (key: K) => V) {
    this.#create = create;
  }

  get(key: K): V {
    let value = this.#map.get(key);

    if (!value) {
      value = this.#create(key);
      this.#map.set(key, value);
    }

    return value;
  }

  delete(key: K): void {
    this.#map.delete(key);
  }
}

class WeakSetMap<K extends object, V> {
  readonly #map = new WeakMap<K, Set<V>>();

  add(key: K, value: V): Set<V> {
    const set = this.#initialized(key);
    set.add(value);
    return set;
  }

  drain(key: K): Set<V> {
    const set = this.#map.get(key);
    this.#map.delete(key);
    return set ?? (EMPTY_SET as Set<V>);
  }

  delete(key: K, value: V): void {
    const set = this.#map.get(key);

    if (set) {
      set.delete(value);
      if (set.size === EMPTY_SIZE) this.#map.delete(key);
    }
  }

  get(key: K): Set<V> {
    return this.#map.get(key) ?? (EMPTY_SET as Set<V>);
  }

  #initialized(key: K): Set<V> {
    let set = this.#map.get(key);

    if (!set) {
      set = new Set();
      this.#map.set(key, set);
    }

    return set;
  }
}
