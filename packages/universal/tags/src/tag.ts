import { dataGetter, def } from "@starbeam/core-utils";
import type {
  CellTag,
  DelegateTag,
  Description,
  FormulaTag,
  StaticTag,
  SubscriptionTarget,
  Tag,
  TagSet,
  UpdateOptions,
} from "@starbeam/interfaces";

import { lastUpdated } from "./tagged.js";
import { NOW } from "./timestamp.js";

export function createCellTag(
  description: Description | undefined,
  lastUpdated = NOW.bump()
): CellTag {
  let frozen = false;

  const tag: CellTag = def(
    {
      type: "cell",
      description,
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

export function createStaticTag(
  description?: Description | undefined
): StaticTag {
  return {
    type: "static",
    description,
    lastUpdated: NOW.now,
    dependencies: () => [],
  };
}

export function createFormulaTag(
  description: Description | undefined,
  children: () => TagSet
): FormulaTag {
  let initialized = false;

  const dependencies = () =>
    [...children()].flatMap((child) => child.dependencies());

  return def(
    {
      type: "formula",
      description,
      markInitialized: () => (initialized = true),
      children,
      dependencies,
    },
    {
      initialized: dataGetter(() => initialized),
      lastUpdated: dataGetter(() => lastUpdated(...dependencies())),
    }
  );
}

export function createDelegateTag(
  description: Description | undefined,
  targets: readonly Tag[]
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
      subscriptionTargets: dataGetter(() => targets.flatMap(getTargets)),
    }
  );
}

export function getTargets(tag: Tag): SubscriptionTarget[] {
  switch (tag.type) {
    case "static":
      return [];
    case "cell":
      return tag.isFrozen() ? [] : [tag];
    case "formula":
      return [tag];
    case "delegate":
      return tag.targets.flatMap(getTargets);
  }
}
