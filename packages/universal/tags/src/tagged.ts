import type {
  CellTag,
  Description,
  DescriptionDescribeOptions,
  Tag,
  Tagged,
  Timestamp,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { zero } from "./timestamp.js";

export function getTag<T extends Tag>(tagged: Tagged<T>): T {
  return tagged[TAG];
}

export function describeTagged(
  tagged: Tagged,
  options?: DescriptionDescribeOptions
): string {
  return getTag(tagged).description.describe(options);
}

export function taggedDescription(tagged: Tagged): Description {
  return getTag(tagged).description;
}

export function* dependenciesInTaggedList(
  taggedList: readonly Tagged[]
): Iterable<CellTag> {
  for (const child of taggedList.map(getTag)) {
    yield* child.dependencies();
  }
}

export function lastUpdatedInTaggedList(
  taggedList: readonly Tagged[]
): Timestamp {
  let lastUpdatedTimestamp = zero();

  for (const child of dependenciesInTaggedList(taggedList)) {
    if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
      lastUpdatedTimestamp = child.lastUpdated;
    }
  }

  return lastUpdatedTimestamp;
}
