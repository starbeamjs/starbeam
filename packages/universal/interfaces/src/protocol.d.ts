import type { REACTIVE } from "@starbeam/shared";

import type { Description } from "./description.js";
import type { Stack } from "./stack.js";
import type { Timestamp } from "./timestamp.js";

export type ReactiveId = number | string | ReactiveId[];

interface Core {
  readonly type: string;
  readonly description: Description;
}

/**
 * Cell is the fundamental mutable reactive value. All subscriptions in Starbeam are ultimately
 * subscriptions to cells, and all mutations in Starbeam are ultimately mutations to cells.
 */
export interface CellCore extends Core {
  readonly type: "mutable";
  readonly lastUpdated: Timestamp;
  isFrozen?: () => boolean;
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
export interface FormulaCore extends Core {
  readonly type: "composite";
  children: () => SubscriptionTarget[];
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
export interface DelegateCore extends Core {
  readonly type: "delegate";
  readonly targets: readonly SubscriptionTarget[];
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
export interface StaticCore extends Core {
  readonly type: "static";
}

export type ReactiveCore = CellCore | FormulaCore | DelegateCore | StaticCore;

export interface SubscriptionTarget<I extends ReactiveCore = ReactiveCore> {
  [REACTIVE]: I;
}

export interface ReactiveValue<
  T = unknown,
  I extends ReactiveCore = ReactiveCore
> extends SubscriptionTarget<I> {
  read: (stack?: Stack) => T;
}

export interface Reactive<T> extends ReactiveValue<T> {
  readonly current: T;
}

export interface ReactiveCell<T> extends Reactive<T, CellCore> {
  current: T;
}
