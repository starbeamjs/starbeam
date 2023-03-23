import type * as Debug from "@starbeam/debug";
import { Desc, Tree } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type {
  CellCore,
  DelegateCore,
  FormulaCore,
  StaticCore,
} from "@starbeam/interfaces";
import { REACTIVE } from "@starbeam/shared";
import { isPresent } from "@starbeam/verify";

import { Timestamp, zero } from "./timestamp.js";

export type Reactive<T> = interfaces.Reactive<T>;

interface ExhaustiveMatcher<T> {
  mutable: (internals: CellCore) => T;
  composite: (internals: FormulaCore) => T;
  delegate: (internals: DelegateCore) => T;
  static: (internals: StaticCore) => T;
}

export type ReactiveCore = interfaces.ReactiveCore;

interface DefaultMatcher<T> extends Partial<ExhaustiveMatcher<T>> {
  default: (internals: ReactiveCore) => T;
}

type Matcher<T> = ExhaustiveMatcher<T> | DefaultMatcher<T>;

export type SubscriptionTarget<
  I extends interfaces.ReactiveCore = interfaces.ReactiveCore
> = interfaces.SubscriptionTarget<I>;

export const SubscriptionTarget = {
  description(this: void, reactive: SubscriptionTarget): Debug.Description {
    return ReactiveCore.description(reactive[REACTIVE]);
  },

  id(this: void, reactive: SubscriptionTarget): interfaces.ReactiveId {
    return ReactiveCore.id(reactive[REACTIVE]);
  },

  is<T extends ReactiveCore["type"] = ReactiveCore["type"]>(
    this: void,
    reactive: SubscriptionTarget,
    kind: T
  ): reactive is {
    [REACTIVE]: Extract<interfaces.ReactiveCore, { type: T }>;
  } {
    return ReactiveCore.is(reactive[REACTIVE], kind);
  },

  match<T>(this: void, reactive: SubscriptionTarget, matcher: Matcher<T>): T {
    return ReactiveCore.match(reactive[REACTIVE], matcher);
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
  subscriptionTargets(
    this: void,
    reactive: SubscriptionTarget
  ): SubscriptionTarget[] {
    const internals = reactive[REACTIVE];

    console.log({ internals });
    if (internals.type === "delegate") {
      return internals.targets.flatMap(SubscriptionTarget.subscriptionTargets);
    } else {
      return [reactive];
    }
  },

  dependencies(
    this: void,
    reactive: SubscriptionTarget
  ): Iterable<interfaces.CellCore> {
    return ReactiveCore.dependencies(reactive[REACTIVE]);
  },

  *dependenciesInList(
    this: void,
    children: readonly SubscriptionTarget[]
  ): Iterable<interfaces.CellCore> {
    for (const child of children) {
      yield* ReactiveCore.dependencies(child[REACTIVE]);
    }
  },

  lastUpdated(this: void, reactive: SubscriptionTarget): Timestamp {
    return ReactiveCore.lastUpdated(reactive[REACTIVE]);
  },

  lastUpdatedIn(this: void, reactives: SubscriptionTarget[]): Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of SubscriptionTarget.dependenciesInList(reactives)) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  },

  log(
    this: void,
    reactive: SubscriptionTarget,
    options: { implementation?: boolean; source?: boolean; id?: boolean } = {}
  ): void {
    ReactiveCore.log(reactive[REACTIVE], options);
  },

  debug(
    this: void,
    reactive: SubscriptionTarget,
    {
      implementation = false,
      source = false,
    }: { implementation?: boolean; source?: boolean } = {}
  ): string {
    return ReactiveCore.debug(reactive[REACTIVE], {
      implementation,
      source,
    });
  },
} as const;

export const ReactiveCore = {
  is<T extends "mutable" | "composite" | "static" | "delegate">(
    this: void,
    internals: interfaces.ReactiveCore,
    kind: T
  ): internals is Extract<interfaces.ReactiveCore, { type: T }> {
    return internals.type === kind;
  },

  id(this: void, internals: interfaces.ReactiveCore): interfaces.ReactiveId {
    return internals.description.id;
  },

  /**
   * Return a flat list of the mutable reactives that this reactive depends on.
   *
   * This list is only valid until the next time anyone reads from the reactive. It's intended to be
   * used along with code that updates the dependencies whenever the reactive is read.
   */
  *dependencies(
    internals: interfaces.ReactiveCore
  ): Iterable<interfaces.CellCore> {
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
        for (const target of ReactiveCore.subscribesTo(internals)) {
          yield* ReactiveCore.dependencies(target);
        }
        break;
      case "composite":
        yield* SubscriptionTarget.dependenciesInList(internals.children());
        break;
    }
  },

  *dependenciesInList(
    this: void,
    children: readonly interfaces.ReactiveCore[]
  ): Iterable<interfaces.CellCore> {
    for (const child of children) {
      yield* ReactiveCore.dependencies(child);
    }
  },

  subscribesTo(
    this: void,
    internals: interfaces.ReactiveCore
  ): interfaces.ReactiveCore[] {
    if (internals.type === "delegate") {
      return internals.targets.flatMap((protocol) =>
        SubscriptionTarget.subscriptionTargets(protocol).map((p) => p[REACTIVE])
      );
    } else {
      return [internals];
    }
  },

  lastUpdated(this: void, internals: interfaces.ReactiveCore): Timestamp {
    switch (internals.type) {
      case "static":
        return zero();
      case "mutable":
        return internals.lastUpdated;
      case "delegate": {
        const delegates = ReactiveCore.subscribesTo(internals);
        return ReactiveCore.lastUpdatedIn(delegates);
      }
      case "composite": {
        let lastUpdatedTimestamp = zero();

        for (const child of ReactiveCore.dependencies(internals)) {
          if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
            lastUpdatedTimestamp = child.lastUpdated;
          }
        }

        return lastUpdatedTimestamp;
      }
    }
  },

  lastUpdatedIn(this: void, core: ReactiveCore[]): Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of ReactiveCore.dependenciesInList(core)) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  },

  description(this: void, core: ReactiveCore): Debug.Description {
    return core.description;
  },

  debug(
    this: void,
    internals: ReactiveCore,
    {
      implementation = false,
      source = false,
      id = false,
    }: { implementation?: boolean; source?: boolean; id?: boolean } = {}
  ): string {
    const dependencies = [...ReactiveCore.dependencies(internals)];
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
    internals: interfaces.ReactiveCore,
    options: { implementation?: boolean; source?: boolean; id?: boolean } = {}
  ): void {
    const debug = ReactiveCore.debug(internals, options);

    console.group(
      ReactiveCore.description(internals).describe({ id: options.id }),
      `(updated at ${Timestamp.debug(ReactiveCore.lastUpdated(internals)).at})`
    );
    console.log(debug);
    console.groupEnd();
  },

  match<T>(
    this: void,
    internals: interfaces.ReactiveCore,
    matcher: Matcher<T>
  ): T {
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
    REACTIVE in value
  );
}

// export const SubscriptionTarget = {
//   is,

//   from<T>(
//     this: void,
//     value: T | Reactive<T>,
//     description?: string | Debug.Description
//   ): Reactive<T> {
//     if (is(value)) {
//       return value;
//     } else {
//       return new Static(value, Desc("static", description));
//     }
//   },
// };

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

class Static<T> implements interfaces.ReactiveValue<T, interfaces.StaticCore> {
  readonly #value: T;
  readonly [REACTIVE]: interfaces.StaticCore;

  constructor(value: T, description: Debug.Description) {
    this.#value = value;
    this[REACTIVE] = {
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
