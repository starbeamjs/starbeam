import type { TAG } from "@starbeam/shared";

import type { CallStack } from "../index.js";
import type { Tag } from "./tag.js";

export type HasTag<T extends Tag = Tag> = T | Tagged<T>;

/**
 * A `Tagged` object is a reactive object that has a `Tag` (which is used to
 * validate it).
 *
 * The `[TAG]` property must not change once it has been read. For this reason,
 * the `dependencies` property is a function, which allows you to keep the tag
 * stable while varying the dependencies (which *are* allowed to change).
 *
 * NOTE: In previous versions of Starbeam, it was legal to change the tag after
 * the tagged object was initially created. However, this made it impossible to
 * use an tagged object's tag as a key in a WeakMap, which meant that the tagged
 * object itself had to be passed around even when it was semantically
 * unimportant.
 */
export interface Tagged<I extends Tag = Tag> {
  readonly [TAG]: I;
}

/**
 * A `TaggedReactive` object is a reactive object that has a `Tag` (which is used
 * to validate it) and a `read` function that can be used to read the current
 * value of the object.
 */
export interface TaggedReactive<T = unknown, I extends Tag = Tag>
  extends Tagged<I> {
  readonly read: (caller?: CallStack) => T;
  readonly current: T;
}

/**
 * A `Reactive` object is a simple alias for a `TaggedReactive` object that
 * makes the types that most people will use just `Reactive<T>`.
 */
export type Reactive<T> = TaggedReactive<T>;
