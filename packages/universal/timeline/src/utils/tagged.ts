import type * as Debug from "@starbeam/debug";
import { debugTag, logTag } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type { Matcher, Tag } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { type Timestamp, zero } from "@starbeam/tags";

export type Tagged<I extends interfaces.Tag = interfaces.Tag> =
  interfaces.Tagged<I>;

export const TaggedUtils = new (class {
  description(this: void, reactive: Tagged): Debug.Description {
    return reactive[TAG].description;
  }

  id(this: void, reactive: Tagged): interfaces.ReactiveId {
    return reactive[TAG].id;
  }

  is<T extends Tag["type"] = Tag["type"]>(
    this: void,
    reactive: Tagged,
    kind: T
  ): reactive is {
    [TAG]: Extract<interfaces.Tag, { type: T }>;
  } {
    return reactive[TAG].type === kind;
  }

  match<T extends Tag>(this: void, reactive: Tagged, matcher: Matcher<T>): T {
    return reactive[TAG].match(matcher) as T;
  }

  /**
   * This method returns a list of reactives that subscribers to the original reactive should
   * actually subscribe to.
   *
   * Normally, this is just the reactive itself. However, if a ReactiveProtocol is a delegate,
   * subscribers can subscribe directly to the delegate's targets.
   *
   * This is because a delegate's targets can't change, so it's safe to subscribe directly to the
   * targets.
   *
   * This makes it possible to create abstractions around reactive values that don't have to worry
   * about manually updating their subscribers when their values change.
   */
  subscriptionTargets(this: void, reactive: Tagged): Tagged[] {
    const tag = reactive[TAG];

    if (tag.type === "delegate") {
      return tag.targets.flatMap(TaggedUtils.subscriptionTargets);
    } else {
      return [reactive];
    }
  }

  dependencies(this: void, reactive: Tagged): Iterable<interfaces.CellTag> {
    return reactive[TAG].dependencies();
  }

  *dependenciesInList(
    this: void,
    children: readonly Tagged[]
  ): Iterable<interfaces.CellTag> {
    for (const child of children) {
      yield* child[TAG].dependencies();
    }
  }

  lastUpdated(this: void, reactive: Tagged): Timestamp {
    return reactive[TAG].lastUpdated;
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
    logTag(reactive[TAG], options);
  }

  debug(
    this: void,
    reactive: Tagged,
    {
      implementation = false,
      source = false,
    }: { implementation?: boolean; source?: boolean } = {}
  ): string {
    return debugTag(reactive[TAG], {
      implementation,
      source,
    });
  }
})();
