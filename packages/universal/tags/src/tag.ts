import { dataGetter, def } from "@starbeam/core-utils";
import type {
  CoreCellTag,
  CoreDelegateTag,
  CoreFormulaTag,
  CoreStaticTag,
  CoreTag,
  CoreTarget,
  Description,
  Timestamp,
  UpdateOptions,
} from "@starbeam/interfaces";

import { lastUpdated } from "./tagged.js";
import { NOW } from "./timestamp.js";

/**
 * Cell is the fundamental mutable reactive value. All subscriptions in Starbeam are ultimately
 * subscriptions to cells, and all mutations in Starbeam are ultimately mutations to cells.
 */
export interface CellTag extends CoreCellTag {
  readonly type: "cell";
  readonly description: Description | undefined;
  readonly lastUpdated: Timestamp;
  isFrozen: () => boolean;
  freeze: () => void;
  update: (options: UpdateOptions) => void;
}

export function createCellTag(
  description: Description | undefined,
  lastUpdated = NOW.bump()
): CellTag {
  let frozen = false;

  const tag: CellTag = def(
    {
      type: "cell",
      description,
      get targets() {
        return frozen ? [] : [tag];
      },
      isFrozen: () => frozen,
      freeze: () => (frozen = true),
      dependencies: () => (frozen ? [] : [tag]),
      update: ({ runtime }: UpdateOptions) => {
        if (frozen) throw TypeError("Cannot update frozen object");
        runtime.subscriptions.bump(tag, (ts) => (lastUpdated = ts));
      },
    },
    {
      lastUpdated: dataGetter(() => lastUpdated),
    }
  );

  return tag;
}

export interface StaticTag extends CoreStaticTag {
  readonly type: "static";
  readonly description: Description | undefined;
}

export function createStaticTag(
  description?: Description | undefined
): StaticTag {
  return {
    type: "static",
    targets: [],
    description,
    lastUpdated: NOW.now,
    dependencies: () => [],
  };
}

export interface FormulaTag extends CoreFormulaTag {
  readonly type: "formula";
  readonly description: Description | undefined;

  /**
   * This flag starts out as false, when the formula hasn't been computed yet.
   * Any subscriptions to an uninitialized formula will be deferred until the
   * formula is initialized.
   */
  readonly initialized: boolean;

  /**
   * This method should be called by the formula's implementation after it is
   * first computed, but before the timeline's `update` method is called.
   */
  markInitialized: () => void;

  /**
   * The current children of this formula. Note that "no children" does not
   * necessarily mean that the formula is static, because a formula has no
   * children before it was first initialized.
   *
   * Data structures built on `FormulaTag` should always read the formula before
   * attempting to read the children if they plan to rely on the absence of
   * children as a strong indicator of staticness.
   */
  children: () => ReadonlySet<CoreTag>;
}

export function createFormulaTag(
  description: Description | undefined,
  children: () => Set<CoreTag>
): FormulaTag {
  let initialized = false;

  const dependencies = () =>
    [...children()].flatMap((child) => child.dependencies());

  const tag: FormulaTag = def(
    {
      type: "formula",
      description,
      get targets(): readonly CoreTarget[] {
        return [tag];
      },
      markInitialized: () => (initialized = true),
      children,
      dependencies,
    },
    {
      initialized: dataGetter(() => initialized),
      lastUpdated: dataGetter(() => lastUpdated(...dependencies())),
    }
  );

  return tag;
}

export interface DelegateTag extends CoreDelegateTag {
  readonly type: "delegate";
  readonly description: Description | undefined;
  readonly targets: readonly CoreTarget[];
}

export function createDelegateTag(
  description: Description | undefined,
  targets: readonly CoreTarget[]
): DelegateTag {
  return def(
    {
      type: "delegate",
      description,
      targets,
      dependencies: () => targets.flatMap((target) => target.dependencies()),
    },
    {
      lastUpdated: dataGetter(() => lastUpdated(...targets)),
      subscriptionTargets: dataGetter(() => targets.flatMap((t) => t.targets)),
    }
  );
}
