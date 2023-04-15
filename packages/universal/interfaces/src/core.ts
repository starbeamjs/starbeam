import type { Description } from "../index.js";
import type { Timestamp } from "./timestamp.js";

/**
 * A tag validates a reactive value. The behavior of a tags is defined in relation to reads and
 * writes of the reactive value they represent. Tags model **value composition** (and functional
 * composition), not a more general algebra.
 *
 * In other words, it doesn't make sense to think about the composition of tags abstracted from the
 * values they represent. Attempting to think about tags this way makes them seem more general than
 * they are, and that generality breaks system invariants derived from value composition.
 */
export interface CoreTag {
  readonly type: "cell" | "formula" | "delegate" | "static";
  readonly description?: Description | undefined;
  readonly lastUpdated: Timestamp;
  readonly dependencies: () => readonly CoreCellTag[];
  readonly targets: readonly CoreTarget[];
}

/**
 * Cell is the fundamental mutable reactive value. All subscriptions in Starbeam are ultimately
 * subscriptions to cells, and all mutations in Starbeam are ultimately mutations to cells.
 */
export interface CoreCellTag extends CoreTag {
  readonly type: "cell";
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
 */
export interface CoreFormulaTag extends CoreTag {
  readonly type: "formula";
  readonly initialized: boolean;
}

/**
 * Delegate is a reactive that represents one or more reactives, but that set of reactives cannot
 * change. This allows you to cache the value of the `delegate` property, and it also allows you to
 * subscribe directly to the delegate's targets.
 *
 * In practice, when you subscribe to a delegate, the timeline subscribes directly to the delegate's
 * targets. This means that delegates don't need to know when their value changes, and don't need to
 * notify the timeline when their targets change.
 */
export interface CoreDelegateTag extends CoreTag {
  readonly type: "delegate";
}

/**
 * Static is a reactive that is guaranteed not to change. This means that you can cache the value of
 * the static reactive and don't need to include it in composite children. All validation semantics
 * act as if static reactives were not present.
 *
 * If a formula or delegate has only static children, it is also static. Even though a formula's
 * children can change, if the formula's *only* children are static, then the formula can never
 * invalidate, and therefore it, itself, is treated as static.
 *
 * TODO: Do we need a separate fundamental type for pollable formulas, which can get new
 * dependencies even if they never invalidate?
 */
export interface CoreStaticTag extends CoreTag {
  readonly type: "static";
}

/**
 * Cells and formulas can be subscribed to directly.
 *
 * A subscription to a formula is a dynamic subscription to its current dependencies.
 * A subscription to a delegate is equivalent to subscribing to its (stable) targets.
 * A subscription to a static is equivalent to subscribing to nothing.
 */
export type CoreTarget = CoreCellTag | CoreFormulaTag;
