import type { CallStack } from "./debug/call-stack.js";
import type { CellTag, FormulaTag, Tag, TagSnapshot } from "./tag.js";
import type { HasTag } from "./tagged.js";
import type { Timestamp } from "./timestamp.js";
import type { Unsubscribe } from "./utils.js";

/**
 * The runtime is the interface that defines the core operations of the
 * reactive system.
 *
 * ## Cells and Formulas
 *
 * - `mark(cell)`: Marks a cell as dirty on write.
 * - `subscribe(reactive)`: Receives readiness notifications for a reactive
 *   value. If the reactive value is a formula, a dynamic mapping from the
 *   formula's dependencies to its subscribers is maintained.
 * - `update(formula)`: Called after a formula is evaluated to updates the
 *   dynamic mapping.
 *
 * ## Tracking Frames
 *
 * - `start`: starts (and stops) a new tracking frame.
 * - `consume`: adds a cell or formula to the current tracking frame.
 *
 * ## Lifetime Management
 *
 * - `onFinalize(object, handler)`: Registers a finalizer handler for an
 * object. - `finalize(object)`: Finalizes an object.
 * - `link(parent, child)`: Link two objects together: when the parent is
 *   finalized, the child will be finalized as well.
 */
export interface Runtime {
  /**
   * Mark a cell as dirty, and notify any subscribers that the cell has been
   * updated. The second parameter to `mark` is a callback that will be called
   * with the current revision of the cell. This callback is returned by the
   * `createCellTag` function.
   */
  readonly mark: (cell: CellTag, mark: (revision: Timestamp) => void) => void;
  /**
   * Indicate that the value associated with the given tag has been consumed.
   */
  readonly consume: (tag: Tag) => void;

  /**
   * Indicate that the computation associated with the given formula has been
   * re-evaluated. This will update the mapping from the formula's dependencies
   * to its subscribers.
   */
  readonly update: (formula: FormulaTag) => void;

  /**
   * Subscribe to notifications that the given tag has updates ready
   * ("readiness notifications").
   *
   * The second parameter to `subscribe` is a callback that will be called
   * *immediately* when the tag is updated.
   *
   * Renderers should use readiness notifications to schedule a render, which
   * should efficiently update the output to reflect the new value of the
   * reactive state.
   */
  readonly subscribe: (target: HasTag, ready: NotifyReady) => Unsubscribe;

  /**
   * Start a new tracking frame. This should be called at the start of a
   * computation that will read from reactive state.
   *
   * The return value of `start` is a function that should be called at the end
   * of the computation. This will return a snapshot of the tags that were read
   * during the computation.
   */
  readonly start: () => () => TagSnapshot;
}

export type NotifyReady = (internals: CellTag) => void;

export type RuntimeFrame = object;

export interface UpdateOptions {
  readonly caller: CallStack | undefined;
  readonly runtime: Runtime;
}
