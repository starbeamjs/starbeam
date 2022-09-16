import type * as Debug from "@starbeam/debug";
import { Tree } from "@starbeam/debug";
import type {
  CompositeInternals,
  DelegateInternals,
  MutableInternals,
  StaticInternals,
  // eslint-disable-next-line import/no-duplicates
} from "@starbeam/interfaces";
// eslint-disable-next-line import/no-duplicates
import type * as interfaces from "@starbeam/interfaces";
import { REACTIVE } from "../../../shared/index.js";
import { isPresent } from "@starbeam/verify";

import { Timestamp, zero } from "./timestamp.js";

interface ExhaustiveMatcher<T> {
  mutable(internals: MutableInternals): T;
  composite(internals: CompositeInternals): T;
  delegate(internals: DelegateInternals): T;
  static(internals: StaticInternals): T;
}

type DefaultMatcher<T> = Partial<ExhaustiveMatcher<T>> & {
  default(internals: interfaces.ReactiveInternals): T;
};

type Matcher<T> = ExhaustiveMatcher<T> | DefaultMatcher<T>;

export type ReactiveProtocol<
  I extends interfaces.ReactiveInternals = interfaces.ReactiveInternals
> = interfaces.ReactiveProtocol<I>;

export const ReactiveProtocol = {
  description(this: void, reactive: ReactiveProtocol): Debug.Description {
    return ReactiveInternals.description(reactive[REACTIVE]);
  },

  is<T extends "mutable" | "composite" | "static" | "delegate">(
    this: void,
    reactive: ReactiveProtocol,
    kind: T
  ): reactive is {
    [REACTIVE]: Extract<interfaces.ReactiveInternals, { type: T }>;
  } {
    return ReactiveInternals.is(reactive[REACTIVE], kind);
  },

  match<T>(this: void, reactive: ReactiveProtocol, matcher: Matcher<T>): T {
    return ReactiveInternals.match(reactive[REACTIVE], matcher);
  },

  subscribesTo(this: void, reactive: ReactiveProtocol): ReactiveProtocol[] {
    const internals = reactive[REACTIVE];

    if (internals.type === "delegate") {
      return internals.delegate.flatMap(ReactiveProtocol.subscribesTo);
    } else {
      return [reactive];
    }
  },

  dependencies(
    this: void,
    reactive: ReactiveProtocol
  ): Iterable<MutableInternals> {
    return ReactiveInternals.dependencies(reactive[REACTIVE]);
  },

  *dependenciesInList(
    this: void,
    children: readonly ReactiveProtocol[]
  ): Iterable<MutableInternals> {
    for (const child of children) {
      yield* ReactiveInternals.dependencies(child[REACTIVE]);
    }
  },

  lastUpdated(this: void, reactive: ReactiveProtocol): Timestamp {
    return ReactiveInternals.lastUpdated(reactive[REACTIVE]);
  },

  lastUpdatedIn(this: void, reactives: ReactiveProtocol[]): Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of ReactiveProtocol.dependenciesInList(reactives)) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  },

  log(
    this: void,
    reactive: ReactiveProtocol,
    options: { implementation?: boolean; source?: boolean } = {}
  ) {
    return ReactiveInternals.log(reactive[REACTIVE], options);
  },

  debug(
    this: void,
    reactive: ReactiveProtocol,
    {
      implementation = false,
      source = false,
    }: { implementation?: boolean; source?: boolean } = {}
  ): string {
    return ReactiveInternals.debug(reactive[REACTIVE], {
      implementation,
      source,
    });
  },
} as const;

export const ReactiveInternals = {
  is<T extends "mutable" | "composite" | "static" | "delegate">(
    this: void,
    internals: interfaces.ReactiveInternals,
    kind: T
  ): internals is Extract<interfaces.ReactiveInternals, { type: T }> {
    return internals.type === kind;
  },

  *dependencies(
    internals: interfaces.ReactiveInternals
  ): Iterable<MutableInternals> {
    switch (internals.type) {
      case "static":
        return;
      case "mutable":
        if (internals.isFrozen && internals.isFrozen()) {
          break;
        }

        yield internals;
        break;
      case "delegate":
        for (const target of ReactiveInternals.subscribesTo(internals)) {
          yield* ReactiveInternals.dependencies(target);
        }
        break;
      case "composite":
        yield* ReactiveProtocol.dependenciesInList(internals.children());
        break;
    }
  },

  *dependenciesInList(
    this: void,
    children: readonly ReactiveInternals[]
  ): Iterable<MutableInternals> {
    for (const child of children) {
      yield* ReactiveInternals.dependencies(child);
    }
  },

  subscribesTo(
    this: void,
    internals: interfaces.ReactiveInternals
  ): interfaces.ReactiveInternals[] {
    if (internals.type === "delegate") {
      return internals.delegate.flatMap((protocol) =>
        ReactiveProtocol.subscribesTo(protocol).map(
          (protocol) => protocol[REACTIVE]
        )
      );
    } else {
      return [internals];
    }
  },

  lastUpdated(this: void, internals: ReactiveInternals): Timestamp {
    switch (internals.type) {
      case "static":
        return zero();
      case "mutable":
        return internals.lastUpdated;
      case "delegate": {
        const delegates = ReactiveInternals.subscribesTo(internals);
        return ReactiveInternals.lastUpdatedIn(delegates);
      }
      case "composite": {
        let lastUpdatedTimestamp = zero();

        for (const child of ReactiveInternals.dependencies(internals)) {
          if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
            lastUpdatedTimestamp = child.lastUpdated;
          }
        }

        return lastUpdatedTimestamp;
      }
    }
  },

  lastUpdatedIn(this: void, internals: ReactiveInternals[]): Timestamp {
    let lastUpdatedTimestamp = zero();

    for (const child of ReactiveInternals.dependenciesInList(internals)) {
      if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
        lastUpdatedTimestamp = child.lastUpdated;
      }
    }

    return lastUpdatedTimestamp;
  },

  description(this: void, internals: ReactiveInternals): Debug.Description {
    return internals.description;
  },

  debug(
    this: void,
    internals: interfaces.ReactiveInternals,
    {
      implementation = false,
      source = false,
    }: { implementation?: boolean; source?: boolean } = {}
  ): string {
    const dependencies = [...ReactiveInternals.dependencies(internals)];
    const descriptions = new Set(
      dependencies.map((dependency) => {
        return implementation
          ? dependency.description
          : dependency.description?.userFacing;
      })
    );

    const nodes = [...descriptions]
      .map((d) => {
        const description = implementation ? d : d?.userFacing;
        return description?.describe({ source });
      })
      .filter(isPresent);

    return Tree(...nodes).format();
  },

  log(
    this: void,
    internals: interfaces.ReactiveInternals,
    options: { implementation?: boolean; source?: boolean } = {}
  ): void {
    const debug = ReactiveInternals.debug(internals, options);

    console.group(
      ReactiveInternals.description(internals).describe(),
      `(updated at ${
        Timestamp.debug(ReactiveInternals.lastUpdated(internals)).at
      })`
    );
    console.log(debug);
    console.groupEnd();
  },

  match<T>(this: void, internals: ReactiveInternals, matcher: Matcher<T>): T {
    return invoke(internals, matcher);

    function invoke<T>(
      internals: interfaces.ReactiveInternals,
      matcher: Matcher<T>
    ): T {
      const fn = matcher[internals.type];
      if (typeof fn === "function") {
        return fn(internals as never);
      }

      return (matcher as DefaultMatcher<T>).default(internals);
    }
  },
};

export type ReactiveInternals = interfaces.ReactiveInternals;

export type Reactive<
  T,
  I extends ReactiveInternals = ReactiveInternals
> = interfaces.Reactive<T, I>;
export const Reactive = {
  is<T>(
    value: unknown | interfaces.Reactive<T>
  ): value is interfaces.Reactive<T> {
    return typeof value === "object" && value !== null && REACTIVE in value;
  },
};
