import type { MutableInternals } from "./internals.js";
import type { LEAF, UNINITIALIZED_REACTIVE } from "./constants.js";

export type ReactiveDependencies =
  | LEAF
  | UNINITIALIZED_REACTIVE
  | readonly MutableInternals[];

export interface ReactiveNode {
  readonly dependencies: ReactiveDependencies;
}

function isArray<A extends readonly U[] | U[], U>(
  value: unknown | A
): value is A {
  return Array.isArray(value);
}
