import type {
  CellTag,
  CoreTimestamp,
  Description,
  FormulaTag,
  TagSnapshot,
  Timestamp,
} from "@starbeam/interfaces";
import { UNINITIALIZED } from "@starbeam/shared";

import { getDependencies } from "./tagged.js";
import { NOW } from "./timestamp.js";

/**
 * Cell is the fundamental mutable reactive value. All subscriptions in Starbeam are ultimately
 * subscriptions to cells, and all mutations in Starbeam are ultimately mutations to cells.
 */
export interface InternalCellTag extends CellTag {
  readonly type: "cell";
  readonly description: Description | undefined;
  readonly lastUpdated: Timestamp;
  isFrozen: () => boolean;
  freeze: () => void;
  update: (revision: CoreTimestamp) => void;
}

export function createCellTag(
  description: Description | undefined,
  lastUpdated: CoreTimestamp = NOW.bump()
): {
  tag: CellTag;
  freeze: () => void;
  mark: (revision: CoreTimestamp) => void;
} {
  let frozen = false;

  const tag: CellTag = {
    type: "cell",
    description,
    dependencies: () => (frozen ? [] : [tag]),
    get lastUpdated() {
      return lastUpdated;
    },
  };

  return {
    tag,
    freeze: () => (frozen = true),
    mark: (revision: CoreTimestamp) => {
      if (frozen) throw TypeError("Cannot update frozen object");
      lastUpdated = revision;
    },
  };
}

export interface InternalFormulaTag extends FormulaTag {
  readonly type: "formula";
  readonly description: Description | undefined;

  /**
   * This method should be called by the formula's implementation after it is
   * first computed, but before the timeline's `update` method is called.
   */
  markInitialized: () => void;
}

export function initializeFormulaTag(
  description: Description | undefined,
  children: () => TagSnapshot
): FormulaTag {
  const { tag, markInitialized } = createFormulaTag(description, children);
  markInitialized();
  return tag;
}

export function createFormulaTag(
  description: Description | undefined,
  children: () => TagSnapshot
): { tag: FormulaTag; markInitialized: () => void } {
  const dependencies = () =>
    [...children()].flatMap((child) => getDependencies(child));

  const tag = {
    type: "formula",
    description,
    dependencies: UNINITIALIZED as UNINITIALIZED | typeof dependencies,
  };

  return {
    tag: tag as FormulaTag,
    markInitialized: () => (tag.dependencies = dependencies),
  };
}
