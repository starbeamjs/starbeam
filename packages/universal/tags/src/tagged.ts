import type { CellTag, CoreTimestamp, Tag, Tagged } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { zero } from "./timestamp.js";

type HasTag<T extends Tag = Tag> = T | Tagged<T>;

export function getTag<T extends Tag>(tagged: HasTag<T>): T {
  return TAG in tagged ? tagged[TAG] : tagged;
}

export function getDependencies(
  ...taggedList: readonly HasTag[]
): readonly CellTag[] {
  return taggedList.flatMap((tagged) => {
    const dependencies = getTag(tagged).dependencies;
    return typeof dependencies === "function" ? dependencies() : [];
  });
}

export function lastUpdated(...taggedList: readonly HasTag[]): CoreTimestamp {
  let lastUpdatedTimestamp: CoreTimestamp = zero();

  for (const child of getDependencies(...taggedList)) {
    if (child.lastUpdated.at > lastUpdatedTimestamp.at) {
      lastUpdatedTimestamp = child.lastUpdated;
    }
  }

  return lastUpdatedTimestamp;
}
