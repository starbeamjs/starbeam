import type * as Debug from "@starbeam/debug";
import { Desc, Tree } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { isPresent } from "@starbeam/verify";

import { Timestamp, zero } from "./timestamp.js";

export type Reactive<T> = interfaces.Reactive<T>;

type ExhaustiveMatcher<T> = {
  [P in interfaces.TagType]: (tag: Extract<interfaces.Tag, { type: P }>) => T;
};

export type Tag = interfaces.Tag;

interface DefaultMatcher<T> extends Partial<ExhaustiveMatcher<T>> {
  default: (internals: Tag) => T;
}

type Matcher<T> = ExhaustiveMatcher<T> | DefaultMatcher<T>;

export type Tagged<I extends interfaces.Tag = interfaces.Tag> =
  interfaces.Tagged<I>;

export const Tagged = {
  description(this: void, reactive: Tagged): Debug.Description {
    return Tag.description(reactive[TAG]);
  },

  id(this: void, reactive: Tagged): interfaces.ReactiveId {
    return Tag.id(reactive[TAG]);
  },

  is<T extends Tag["type"] = Tag["type"]>(
    this: void,
    reactive: Tagged,
    kind: T
  ): reactive is {
    [TAG]: Extract<interfaces.Tag, { type: T }>;
  } {
    return Tag.is(reactive[TAG], kind);
  },

  match<T>(this: void, reactive: Tagged, matcher: Matcher<T>): T {
    return Tag.match(reactive[TAG], matcher);
  },

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
    const internals = reactive[TAG];

    console.log({ internals });
    if (internals.type === "delegate") {
      return internals.targets.flatMap(Tagged.subscriptionTargets);
    } else {
      return [reactive];
    }
  },

  dependencies(this: void, reactive: Tagged): Iterable<interfaces.CellTag> {
    return Tag.dependencies(reactive[TAG]);
  },

  *dependenciesInList(
    this: void,
    children: readonly Tagged[]
  ): Iterable<interfaces.CellTag> {
    for (const child of children) {
      yield* Tag.dependencies(child[TAG]);
    }
  },

  lastUpdated(this: void, reactive: Tagged): Timestamp {
    return Tag.lastUpdated(reactive[TAG]);
  },

  lastUpdatedIn(this: void, reactives: Tagged[]): Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of Tagged.dependenciesInList(reactives)) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  },

  log(
    this: void,
    reactive: Tagged,
    options: { implementation?: boolean; source?: boolean; id?: boolean } = {}
  ): void {
    Tag.log(reactive[TAG], options);
  },

  debug(
    this: void,
    reactive: Tagged,
    {
      implementation = false,
      source = false,
    }: { implementation?: boolean; source?: boolean } = {}
  ): string {
    return Tag.debug(reactive[TAG], {
      implementation,
      source,
    });
  },
} as const;

export const Tag = {
  is<T extends interfaces.TagType>(
    this: void,
    internals: interfaces.Tag,
    kind: T
  ): internals is Extract<interfaces.Tag, { type: T }> {
    return internals.type === kind;
  },

  id(this: void, internals: interfaces.Tag): interfaces.ReactiveId {
    return internals.description.id;
  },

  /**
   * Return a flat list of the mutable reactives that this reactive depends on.
   *
   * This list is only valid until the next time anyone reads from the reactive. It's intended to be
   * used along with code that updates the dependencies whenever the reactive is read.
   */
  *dependencies(internals: interfaces.Tag): Iterable<interfaces.CellTag> {
    switch (internals.type) {
      case "static":
        return;
      case "mutable":
        if (internals.isFrozen?.()) {
          break;
        }

        yield internals;
        break;
      case "delegate":
        for (const target of Tag.subscribesTo(internals)) {
          yield* Tag.dependencies(target);
        }
        break;
      case "formula":
        yield* Tagged.dependenciesInList(internals.children());
        break;
    }
  },

  *dependenciesInList(
    this: void,
    children: readonly interfaces.Tag[]
  ): Iterable<interfaces.CellTag> {
    for (const child of children) {
      yield* Tag.dependencies(child);
    }
  },

  subscribesTo(this: void, internals: interfaces.Tag): interfaces.Tag[] {
    if (internals.type === "delegate") {
      return internals.targets.flatMap((protocol) =>
        Tagged.subscriptionTargets(protocol).map((p) => p[TAG])
      );
    } else {
      return [internals];
    }
  },

  lastUpdated(this: void, internals: interfaces.Tag): Timestamp {
    switch (internals.type) {
      case "static":
        return zero();
      case "mutable":
        return internals.lastUpdated;
      case "delegate": {
        const delegates = Tag.subscribesTo(internals);
        return Tag.lastUpdatedIn(delegates);
      }
      case "formula": {
        let lastUpdatedTimestamp = zero();

        for (const child of Tag.dependencies(internals)) {
          if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
            lastUpdatedTimestamp = child.lastUpdated;
          }
        }

        return lastUpdatedTimestamp;
      }
    }
  },

  lastUpdatedIn(this: void, core: Tag[]): Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of Tag.dependenciesInList(core)) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  },

  description(this: void, core: Tag): Debug.Description {
    return core.description;
  },

  debug(
    this: void,
    internals: Tag,
    {
      implementation = false,
      source = false,
      id = false,
    }: { implementation?: boolean; source?: boolean; id?: boolean } = {}
  ): string {
    const dependencies = [...Tag.dependencies(internals)];
    const descriptions = new Set(
      dependencies.map((dependency) => {
        return implementation
          ? dependency.description
          : dependency.description.userFacing;
      })
    );

    const nodes = [...descriptions]
      .map((d) => {
        const description = implementation ? d : d.userFacing;
        return description.describe({ source, id });
      })
      .filter(isPresent);

    return Tree(...nodes).format();
  },

  log(
    this: void,
    internals: interfaces.Tag,
    options: { implementation?: boolean; source?: boolean; id?: boolean } = {}
  ): void {
    const debug = Tag.debug(internals, options);

    console.group(
      Tag.description(internals).describe({ id: options.id }),
      `(updated at ${Timestamp.debug(Tag.lastUpdated(internals)).at})`
    );
    console.log(debug);
    console.groupEnd();
  },

  match<T>(this: void, internals: interfaces.Tag, matcher: Matcher<T>): T {
    const fn = matcher[internals.type];
    if (typeof fn === "function") {
      return fn(internals as never);
    }

    return (matcher as DefaultMatcher<T>).default(internals);
  },
};

function is<T>(
  this: void,
  value: T | interfaces.Reactive<T>
): value is interfaces.Reactive<T> {
  return !!(
    value &&
    (typeof value === "object" || typeof value === "function") &&
    TAG in value
  );
}

export const Reactive = {
  is<T>(this: void, value: unknown): value is interfaces.Reactive<T> {
    return is(value) && hasRead(value);
  },

  from<T>(
    this: void,
    value: T | Reactive<T>,
    description?: string | Debug.Description
  ): Reactive<T> {
    if (Reactive.is(value)) {
      return value;
    } else {
      return new Static(value, Desc("static", description));
    }
  },
};

function hasRead<T>(value: object): value is { read: () => T } {
  return "read" in value && typeof value.read === "function";
}

class Static<T> implements interfaces.ReactiveValue<T, interfaces.StaticTag> {
  readonly #value: T;
  readonly [TAG]: interfaces.StaticTag;

  constructor(value: T, description: Debug.Description) {
    this.#value = value;
    this[TAG] = {
      type: "static",
      description,
    };
  }

  get current(): T {
    return this.#value;
  }

  read(): T {
    return this.#value;
  }
}
