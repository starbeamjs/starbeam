import type { CellTag, Diff, FormulaTag } from "@starbeam/interfaces";

import type { Unsubscribe } from "../lifetime/object-lifetime.js";
import { Tagged } from "./protocol.js";
import { diff } from "./utils.js";

export type NotifyReady = (internals: CellTag) => void;

/**
 * A subscription is a weak mapping from individual cells to the subscriptions that depend on them.
 *
 * This is an interesting problem because consumers can subscribe to reactive values whose cell
 * depenencies change over time (such as formulas).
 *
 * We want:
 *
 * 1. A direct mapping from cells to subscribers. This means that we know (directly) what
 *    subscribers are interested in a cell mutation, allowing us to do synchronous bookkeeping
 *    related to subscribers as mutations occur.
 * 2. A weak mapping from cells to subscribers. If a cell is GC'ed, then no additional mutations to
 *    it can occur, and we don't need to maintain a hard reference to the cell or its subscribers.
 *
 * We accomplish this by keeping a weak mapping from formulas to subscriptions, and a second weak
 * mapping from cells to subscriptions.
 *
 * When a cell is mutated, we have a direct mapping to the subscriber without additional
 * computations.
 *
 * When a formula is recomputed, we:
 *
 * 1. get its subscriptions from the mapping.
 * 2. remove the subscriptions from any cells that are no longer dependencies.
 * 3. add the subscriptions to any cells that are now dependencies.
 *
 * This makes reading formulas a bit slower, but simplifies cell mutation. This is a good trade-off,
 * since formula computation is typically scheduled, and happens in response to potentially many
 * mutations.
 *
 * @see [A detailed description of the approach used here](./subscriptions.md)
 */
export class Subscriptions {
  static create(): Subscriptions {
    return new Subscriptions();
  }

  readonly #formulaMap = FormulaMap.empty();
  readonly #cellMap = CellMap.empty();

  /**
   * Register a notification for a reactive value.
   *
   * - If the reactive value is a cell, the notification will fire whenever the cell is mutated.
   * - If the reactive value is a formula, the notification will fire whenever any of the cell's
   *   dependencies of the formula are mutated.
   *
   * ---
   * TODO: Is it necessary to fire notifications when the formula is recomputed? What if a formula
   * has two consumers, and they both read the formula, get dependencies A and B and register
   * notifications. The first consumer reads the formula again, producing dependencies B and C, and
   * then mutates A.
   *
   * Current thinking: Since the notifications never fired, that must mean that neither A nor B
   * changed. Therefore, re-computing the formula should not have invalidated, so the whole scenario
   * is impossible.
   *
   * However, it probably *is* possible with `PolledFormula`, which intentionally allows a formula
   * to be recomputed even if its Starbeam deps haven't changed. One possibility is that we might
   * want to restrict `PolledFormula` to its current use-case of a single consumer. Alternatively,
   * we may want to fire notifications whenever a `PolledFormula` is recomputed and produces
   * different dependencies.
   */
  register(target: Tagged, ready: NotifyReady): Unsubscribe {
    const subscriptionTargets = Tagged.subscriptionTargets(target);

    const unsubscribes = subscriptionTargets.map((t) => {
      const entry = this.#formulaMap.register(t);
      for (const dependency of Tagged.dependencies(t)) {
        this.#cellMap.register(dependency, entry);
      }

      return entry.subscribe(ready);
    });

    return () => {
      for (const unsubscribe of unsubscribes) {
        unsubscribe();
      }
    };
  }

  /**
   * Notify the subscribers of a particular cell. This happens synchronously during mutation.
   */
  notify(mutable: CellTag): void {
    this.#cellMap.notify(mutable);
  }

  /**
   * Update the internal mappings for a formula. This happens after a formula was recomputed. It
   * results in removing mappings from cells that are no longer dependencies and adding mappings for
   * cells that have become dependencies.
   */
  update(frame: Tagged<FormulaTag>): void {
    const cellMap = this.#cellMap;

    const { add, remove, entry } = this.#formulaMap.update(frame);
    cellMap.remove(remove, entry);
    cellMap.add(add, entry);
  }
}

/**
 * A mapping from reactives (basically formulas) to their subscriptions.
 */
class FormulaMap {
  static empty(): FormulaMap {
    return new FormulaMap();
  }

  readonly #mapping = new WeakMap<Tagged, ReactiveSubscription>();

  update(
    frame: Tagged<FormulaTag>
  ): Diff<CellTag> & { entry: ReactiveSubscription } {
    const entry = this.#mapping.get(frame);

    if (entry) {
      return { ...entry.update(frame), entry };
    } else {
      const entry = ReactiveSubscription.create(frame);
      this.#mapping.set(frame, entry);
      return {
        add: new Set(Tagged.dependencies(frame)),
        remove: new Set(),
        entry,
      };
    }
  }

  register(target: Tagged): ReactiveSubscription {
    let entry = this.#mapping.get(target);

    if (!entry) {
      entry = ReactiveSubscription.create(target);
      this.#mapping.set(target, entry);
    }

    return entry;
  }
}

class ReactiveSubscription {
  static create(target: Tagged): ReactiveSubscription {
    const deps = new Set(Tagged.dependencies(target));
    return new ReactiveSubscription(deps);
  }

  #deps: Set<CellTag>;
  readonly #ready = new Set<NotifyReady>();

  private constructor(deps: Set<CellTag>) {
    this.#deps = deps;
  }

  subscribe(ready: NotifyReady): Unsubscribe {
    this.#ready.add(ready);
    return () => this.#ready.delete(ready);
  }

  notify(internals: CellTag): void {
    for (const ready of this.#ready) {
      ready(internals);
    }
  }

  update(frame: Tagged<FormulaTag>): Diff<CellTag> {
    const prev = this.#deps;
    const next = new Set(Tagged.dependencies(frame));
    this.#deps = next;

    return diff(prev, next);
  }
}

/**
 * CellMap keeps track of the current subscriptions for a specific cell.
 *
 * When a mutation occurs, the `CellMap` knows exactly which subscriptions it needs to notify,
 * which keeps the mutation path simple.
 */
class CellMap {
  static empty(): CellMap {
    return new CellMap();
  }

  readonly #entriesMap = new WeakMap<CellTag, Set<ReactiveSubscription>>();

  remove(mutables: ReadonlySet<CellTag>, entry: ReactiveSubscription): void {
    for (const mutable of mutables) {
      this.#entriesMap.get(mutable)?.delete(entry);
    }
  }

  add(mutables: ReadonlySet<CellTag>, entry: ReactiveSubscription): void {
    for (const mutable of mutables) {
      this.#initialized(mutable).add(entry);
    }
  }

  register(mutable: CellTag, entry: ReactiveSubscription): void {
    this.#initialized(mutable).add(entry);
  }

  notify(mutable: CellTag): void {
    for (const entry of this.#entries(mutable)) {
      entry.notify(mutable);
    }
  }

  *#entries(mutable: CellTag): IterableIterator<ReactiveSubscription> {
    const entries = this.#entriesMap.get(mutable);

    if (entries) {
      yield* entries;
    }
  }

  #initialized(mutable: CellTag): Set<ReactiveSubscription> {
    let entries = this.#entriesMap.get(mutable);

    if (!entries) {
      entries = new Set();
      this.#entriesMap.set(mutable, entries);
    }

    return entries;
  }
}
