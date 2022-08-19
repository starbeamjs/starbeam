import type { Unsubscribe } from "../lifetime/object-lifetime.js";
import type { MutableInternals } from "./protocol.js";
import { ReactiveProtocol } from "./protocol.js";
import { Timestamp } from "./timestamp.js";
import { diff } from "./utils.js";

export class Subscription {
  #dependencies: Set<MutableInternals>;
  #lastNotified: undefined | Timestamp;
  #ready: (internals: MutableInternals) => void;

  constructor(
    dependencies: Set<MutableInternals>,
    lastNotified: undefined | Timestamp,
    ready: (internals: MutableInternals) => void
  ) {
    this.#dependencies = dependencies;
    this.#lastNotified = lastNotified;
    this.#ready = ready;
  }

  update(dependencies: Set<MutableInternals>): void {
    this.#dependencies = dependencies;
  }

  get dependencies(): Set<MutableInternals> {
    return this.#dependencies;
  }

  get lastNotified(): Timestamp | undefined {
    return this.#lastNotified;
  }

  notify(timestamp: Timestamp, internals: MutableInternals): void {
    this.#lastNotified = timestamp;
    this.#ready(internals);
  }
}

export class Subscriptions {
  static create(): Subscriptions {
    return new Subscriptions(new WeakMap(), new WeakMap());
  }

  #reactiveMap: WeakMap<ReactiveProtocol, Set<Subscription>>;
  #depMap: WeakMap<MutableInternals, Set<Subscription>>;

  private constructor(
    pollableMap: WeakMap<ReactiveProtocol, Set<Subscription>>,
    readyMap: WeakMap<MutableInternals, Set<Subscription>>
  ) {
    this.#reactiveMap = pollableMap;
    this.#depMap = readyMap;
  }

  notify(dependency: MutableInternals): void {
    const subscriptions = this.#depMap.get(dependency);

    if (subscriptions) {
      for (const subscription of subscriptions) {
        subscription.notify(Timestamp.now(), dependency);
      }
    }
  }

  register(
    reactive: ReactiveProtocol,
    ready: (internals: MutableInternals) => void
  ): Unsubscribe {
    const subscribesTo = ReactiveProtocol.subscribesTo(reactive);
    const dependencies = new Set(ReactiveProtocol.dependencies(reactive));

    const subscription = new Subscription(dependencies, Timestamp.now(), ready);

    for (const dependency of dependencies) {
      this.#addDep(dependency, subscription);
    }

    for (const subscribeTo of subscribesTo) {
      this.#addReactive(subscribeTo, subscription);
    }

    return () => {
      for (const subscribeTo of subscribesTo) {
        this.#removeReactive(subscribeTo, subscription);
      }
    };
  }

  update(reactive: ReactiveProtocol): void {
    const pollables = this.#reactiveMap.get(reactive);

    if (!pollables) {
      return;
    }

    const next = new Set(ReactiveProtocol.dependencies(reactive));
    const lastUpdatedNext = ReactiveProtocol.lastUpdated(reactive);

    for (const pollable of pollables) {
      const prev = pollable.dependencies;
      const lastNotified = pollable.lastNotified;

      const { add, remove } = diff(prev, next);

      for (const dep of add) {
        this.#addDep(dep, pollable);
      }

      for (const dep of remove) {
        this.#removeDep(dep, pollable);
      }

      pollable.update(next);

      if (lastNotified === undefined || lastUpdatedNext.gt(lastNotified)) {
        // pollable.notify(Timestamp.now());
      }
    }
  }

  #addReactive(reactive: ReactiveProtocol, pollable: Subscription): void {
    let pollableSet = this.#reactiveMap.get(reactive);

    if (!pollableSet) {
      pollableSet = new Set();
      this.#reactiveMap.set(reactive, pollableSet);
    }

    pollableSet.add(pollable);
  }

  #removeReactive(
    reactive: ReactiveProtocol,
    subscription: Subscription
  ): void {
    const pollableSet = this.#reactiveMap.get(reactive);

    if (pollableSet) {
      pollableSet.delete(subscription);
    }

    const dependencies = subscription.dependencies;

    for (const dependency of dependencies) {
      this.#removeDep(dependency, subscription);
    }
  }

  #addDep(dependency: MutableInternals, subscription: Subscription): void {
    let depSet = this.#depMap.get(dependency);

    if (!depSet) {
      depSet = new Set();
      this.#depMap.set(dependency, depSet);
    }

    depSet.add(subscription);
  }

  #removeDep(dependency: MutableInternals, pollable: Subscription): void {
    const readySet = this.#depMap.get(dependency);

    if (readySet) {
      readySet.delete(pollable);
    }
  }
}
