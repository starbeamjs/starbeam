import type { UNINITIALIZED } from "@starbeam/shared";

import type { Description } from "./debug/description.js";
import type { CoreTimestamp } from "./timestamp.js";

export type TagSnapshot = ReadonlySet<Tag>;
export type TagSet = Set<Tag>;

/**
 * Cell is the fundamental mutable reactive value. All subscriptions in Starbeam
 * are ultimately subscriptions to cells, and all mutations in Starbeam are
 * ultimately mutations to cells.
 *
 * If a cell has `undefined` dependencies, that means that the cell cannot
 * change anymore. This allows it to be removed from any formulas that depend on
 * it.
 */
export interface CellTag {
  readonly type: "cell";
  readonly description?: Description | undefined;
  readonly lastUpdated: CoreTimestamp;
  readonly dependencies: () => readonly CellTag[];
}

/**
 * Formula is a reactive that has *dynamic* children. This means that you can't cache the children
 * (or subscribe directly to them), because they may change. This is different from delegates, which
 * are guaranteed to have the same set of children forever.
 *
 * Composite reactives must notify the timeline when their children have changed.
 *
 * A subscription to a composite reactive is a subscription to its current children, as of the last
 * time the timeline was notified of changes to the composite's children. Whenever the timeline is
 * notified of a change to the composite's children, it removes subscriptions from any stale
 * dependencies and adds subscriptions to any new dependencies.
 *
 * TODO: Do we need a separate fundamental type for non-cached formulas, which can get new
 * dependencies even if they never invalidate?
 */
export interface FormulaTag {
  readonly type: "formula";
  readonly description?: Description | undefined;
  readonly dependencies: UNINITIALIZED | (() => readonly CellTag[]);
}

/**
 * A tag validates a reactive value. The behavior of a tags is defined in relation to reads and
 * writes of the reactive value they represent. Tags model **value composition** (and functional
 * composition), not a more general algebra.
 *
 * In other words, it doesn't make sense to think about the composition of tags abstracted from the
 * values they represent. Attempting to think about tags this way makes them seem more general than
 * they are, and that generality breaks system invariants derived from value composition.
 */
export type Tag = CellTag | FormulaTag;
