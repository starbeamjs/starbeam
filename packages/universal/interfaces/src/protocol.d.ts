import type { TAG } from "@starbeam/shared";

import type { Description } from "./description.js";
import type { Stack } from "./stack.js";
import type { Timestamp } from "./timestamp.js";

export type ReactiveId = number | string | ReactiveId[];

export interface AbstractTag {
  readonly type: TagType;
  readonly description: Description;
}

export type List<T> = Iterable<T>;

export class TagMethods {
  readonly id: ReactiveId;
  readonly lastUpdated: Timestamp;
  readonly dependencies: () => List<CellTag>;
  readonly description: Description;
  match(matcher: Matcher<T>): Tag;
  subscriptionTargets(): List<Tag>;
}

export type ExhaustiveMatcher<T> = {
  [P in TagType]: (tag: Extract<Tag, { type: P }>) => T;
};

export interface DefaultMatcher<T> extends Partial<ExhaustiveMatcher<T>> {
  default: (internals: Tag) => T;
}

export type Matcher<T> = ExhaustiveMatcher<T> | DefaultMatcher<T>;

export interface UpdateOptions {
  readonly stack: Stack;
  readonly timeline: { bump: (tag: CellTag, caller: Stack) => Timestamp };
}

/**
 * Cell is the fundamental mutable reactive value. All subscriptions in Starbeam are ultimately
 * subscriptions to cells, and all mutations in Starbeam are ultimately mutations to cells.
 */
export interface CellTag extends AbstractTag, TagMethods {
  readonly type: "cell";
  readonly lastUpdated: Timestamp;
  isFrozen?: () => boolean;
  update: (options: UpdateOptions) => void;
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
export interface FormulaTag extends AbstractTag, TagMethods {
  readonly type: "formula";
  children: () => readonly Tagged[];
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
export interface DelegateTag extends AbstractTag, TagMethods {
  readonly type: "delegate";
  readonly targets: readonly Tagged[];
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
export interface StaticTag extends AbstractTag, TagMethods {
  readonly type: "static";
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
export type Tag = CellTag | FormulaTag | DelegateTag | StaticTag;
export type TagType = Tag["type"];
export type SpecificTag<T extends TagType> = Extract<Tag, { type: T }>;

/**
 * A `Tagged` object is a reactive object that has a `Tag` (which is used to
 * validate it).
 *
 * NOTE: In previous versions of Starbeam, it was legal to change the tag after
 * the tagged object was initially created. However, this made it impossible to
 * use an tagged object's tag as a key in a WeakMap, which meant that the tagged
 * object itself had to be passed around even when it was semantically
 * unimportant.
 *
 * These days, the `[TAG]` property must not change once it has been read. For
 * this reason, the `FormulaTag`'s `children` property is a function, which
 * allows you to keep the tag stable while varying the children (which *are*
 * allowed to change, since that's the point of `FormulaTag`).
 */
export interface Tagged<I extends Tag = Tag> {
  readonly [TAG]: I;
}

export interface ReactiveValue<T = unknown, I extends Tag = Tag>
  extends Tagged<I> {
  read: (stack?: Stack) => T;
}

export interface Reactive<T> extends ReactiveValue<T> {
  readonly current: T;
}

export interface ReactiveCell<T> extends Reactive<T, CellTag> {
  current: T;
}
