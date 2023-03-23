import type * as Debug from "@starbeam/debug";
import { debugTag, logTag } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type { Matcher, SpecificTag, TagType } from "@starbeam/interfaces";
import { getTag, type Tag } from "@starbeam/tags";
import { type Timestamp, zero } from "@starbeam/tags";

export type Tagged<I extends interfaces.Tag = interfaces.Tag> =
  interfaces.Tagged<I>;

export const TaggedUtils = new (class {
  description(this: void, reactive: Tagged): Debug.Description {
    return getTag(reactive).description;
  }

  id(this: void, reactive: Tagged): interfaces.ReactiveId {
    return getTag(reactive).id;
  }

  is<T extends TagType>(
    this: void,
    reactive: Tagged,
    kind: T
  ): reactive is Tagged<SpecificTag<T>> {
    return getTag(reactive).type === kind;
  }

  match<T extends Tag>(this: void, reactive: Tagged, matcher: Matcher<T>): T {
    return getTag(reactive).match(matcher) as T;
  }

  dependencies(this: void, reactive: Tagged): Iterable<interfaces.CellTag> {
    return getTag(reactive).dependencies();
  }

  *dependenciesInList(
    this: void,
    children: readonly Tagged[]
  ): Iterable<interfaces.CellTag> {
    for (const child of children.map(getTag)) {
      yield* child.dependencies();
    }
  }

  lastUpdated(this: void, reactive: Tagged): Timestamp {
    return getTag(reactive).lastUpdated;
  }

  lastUpdatedIn(this: void, reactives: Tagged[]): Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of TaggedUtils.dependenciesInList(reactives)) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  }

  log(
    this: void,
    reactive: Tagged,
    options: { implementation?: boolean; source?: boolean; id?: boolean } = {}
  ): void {
    logTag(getTag(reactive), options);
  }

  debug(
    this: void,
    reactive: Tagged,
    {
      implementation = false,
      source = false,
    }: { implementation?: boolean; source?: boolean } = {}
  ): string {
    return debugTag(getTag(reactive), {
      implementation,
      source,
    });
  }
})();
