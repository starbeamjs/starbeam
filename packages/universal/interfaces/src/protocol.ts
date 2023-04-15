import type { TAG } from "@starbeam/shared";

import type { CoreTag } from "./core.js";
import type { CallStack } from "./debug/call-stack.js";

export type ReactiveId = number | string | ReactiveId[];

export type TagSet = ReadonlySet<CoreTag>;

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
export interface Tagged<I extends CoreTag = CoreTag> {
  readonly [TAG]: I;
}

export interface ReactiveValue<T = unknown, I extends CoreTag = CoreTag>
  extends Tagged<I> {
  read: (stack?: CallStack) => T;
}

export interface Reactive<T> extends ReactiveValue<T> {
  readonly current: T;
}

export interface TaggedReactive<I extends CoreTag, T = unknown>
  extends ReactiveValue<T, I> {
  readonly current: T;
}
