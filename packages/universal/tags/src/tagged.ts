import type {
  CoreCellTag,
  CoreTag,
  Description,
  Tagged,
  Timestamp,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { zero } from "./timestamp.js";

type HasTag<T extends CoreTag = CoreTag> = T | Tagged<T>;

export function getTag<T extends CoreTag>(tagged: HasTag<T>): T {
  return TAG in tagged ? tagged[TAG] : tagged;
}

export function getTags<T extends HasTag[]>(
  tagged: T
): { [P in keyof T]: T[P] extends HasTag<infer U> ? U : never } {
  return tagged.map(getTag) as never;
}

export function getDescription(tagged: HasTag): Description | undefined {
  return getTag(tagged).description;
}

export function getDependencies(
  ...taggedList: readonly HasTag[]
): readonly CoreCellTag[] {
  return taggedList.flatMap((tagged) => getTag(tagged).dependencies());
}

export function lastUpdated(...taggedList: readonly HasTag[]): Timestamp {
  let lastUpdatedTimestamp = zero();

  for (const child of getDependencies(...taggedList)) {
    if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
      lastUpdatedTimestamp = child.lastUpdated;
    }
  }

  return lastUpdatedTimestamp;
}
