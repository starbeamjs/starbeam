import { isPresentArray } from "@starbeam/core-utils";
import type {
  CellTag,
  CoreTimestamp,
  Description,
  Tag,
  Tagged,
  Timestamp,
} from "@starbeam/interfaces";
import { TAG, UNINITIALIZED } from "@starbeam/shared";

import { zero } from "./timestamp.js";

type HasTag<T extends Tag = Tag> = T | Tagged<T>;

export function getTag<T extends Tag>(tagged: HasTag<T>): T {
  return TAG in tagged ? tagged[TAG] : tagged;
}

export function hasDependencies(
  tagged: Tag
): tagged is Tag & { readonly dependencies: () => readonly CellTag[] } {
  const deps = getTag(tagged).dependencies;
  return deps !== UNINITIALIZED && isPresentArray(deps());
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
): readonly CellTag[] {
  return taggedList.flatMap((tagged) => {
    const dependencies = getTag(tagged).dependencies;
    return typeof dependencies === "function" ? dependencies() : [];
  });
}

export function lastUpdated(...taggedList: readonly HasTag[]): Timestamp {
  let lastUpdatedTimestamp: CoreTimestamp = zero();

  for (const child of getDependencies(...taggedList)) {
    if (child.lastUpdated.at > lastUpdatedTimestamp.at) {
      lastUpdatedTimestamp = child.lastUpdated;
    }
  }

  return lastUpdatedTimestamp as Timestamp;
}
