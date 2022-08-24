import * as Debug from "@starbeam/debug";
import { Tree } from "@starbeam/debug";
import type {
  CompositeInternals,
  DelegateInternals,
  MutableInternals,
  ReactiveInternals,
  StaticInternals,
  // eslint-disable-next-line import/no-duplicates
} from "@starbeam/interfaces";
// eslint-disable-next-line import/no-duplicates
import type * as interfaces from "@starbeam/interfaces";
import { REACTIVE } from "@starbeam/peer";
import { isPresent } from "@starbeam/verify";

import { Timestamp, zero } from "./timestamp.js";

interface ExhaustiveMatcher<T> {
  mutable(internals: MutableInternals): T;
  composite(internals: CompositeInternals): T;
  delegate(internals: DelegateInternals): T;
  static(internals: StaticInternals): T;
}

type DefaultMatcher<T> = Partial<ExhaustiveMatcher<T>> & {
  default(internals: ReactiveInternals): T;
};

type Matcher<T> = ExhaustiveMatcher<T> | DefaultMatcher<T>;

export type ReactiveProtocol = interfaces.ReactiveProtocol;

export const ReactiveProtocol = {
  description(this: void, reactive: ReactiveProtocol): Debug.Description {
    let desc = reactive[REACTIVE].description;

    if (!desc) {
      desc = Debug.descriptionFrom({
        type: ReactiveProtocol.match(reactive, {
          static: () => "static",
          composite: () => "formula",
          delegate: () => "delegate",
          mutable: () => "cell",
        }),
        api: "unknown",
      });
    }

    return desc;
  },

  is<T extends "mutable" | "composite" | "static" | "delegate">(
    this: void,
    reactive: ReactiveProtocol,
    kind: T
  ): reactive is { [REACTIVE]: Extract<ReactiveInternals, { type: T }> } {
    return reactive[REACTIVE].type === kind;
  },

  match<T>(this: void, reactive: ReactiveProtocol, matcher: Matcher<T>): T {
    return invoke(reactive[REACTIVE], matcher);

    function invoke<T>(internals: ReactiveInternals, matcher: Matcher<T>): T {
      const fn = matcher[internals.type];
      if (typeof fn === "function") {
        return fn(internals as never);
      }

      return (matcher as DefaultMatcher<T>).default(internals);
    }
  },

  subscribesTo(this: void, reactive: ReactiveProtocol): ReactiveProtocol[] {
    const internals = reactive[REACTIVE];

    if (internals.type === "delegate") {
      return internals.delegate.flatMap(ReactiveProtocol.subscribesTo);
    } else {
      return [reactive];
    }
  },

  *dependencies(
    this: void,
    reactive: ReactiveProtocol
  ): Iterable<MutableInternals> {
    const internals = reactive[REACTIVE];
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
        for (const protocol of ReactiveProtocol.subscribesTo(reactive)) {
          yield* ReactiveProtocol.dependencies(protocol);
        }
        break;
      case "composite":
        yield* ReactiveProtocol.dependenciesInList(internals.children());
        break;
    }
  },

  *dependenciesInList(
    this: void,
    children: readonly ReactiveProtocol[]
  ): Iterable<MutableInternals> {
    for (const child of children) {
      yield* ReactiveProtocol.dependencies(child);
    }
  },

  lastUpdated(this: void, reactive: ReactiveProtocol): Timestamp {
    const internals = reactive[REACTIVE];

    switch (internals.type) {
      case "static":
        return zero();
      case "mutable":
        return internals.lastUpdated;
      case "delegate": {
        const delegates = ReactiveProtocol.subscribesTo(reactive);
        return ReactiveProtocol.lastUpdatedIn(delegates);
      }
      case "composite": {
        let lastUpdatedTimestamp = zero();

        for (const child of ReactiveProtocol.dependencies(reactive)) {
          if (child.lastUpdated.gt(lastUpdatedTimestamp)) {
            lastUpdatedTimestamp = child.lastUpdated;
          }
        }

        return lastUpdatedTimestamp;
      }
    }
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
    const debug = ReactiveProtocol.debug(reactive, options);

    console.group(
      ReactiveProtocol.description(reactive).describe(),
      `(updated at ${
        Timestamp.debug(ReactiveProtocol.lastUpdated(reactive)).at
      })`
    );
    console.log(debug);
    console.groupEnd();
  },

  debug(
    this: void,
    reactive: ReactiveProtocol,
    {
      implementation = false,
      source = false,
    }: { implementation?: boolean; source?: boolean } = {}
  ): string {
    const dependencies = [...ReactiveProtocol.dependencies(reactive)];
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
} as const;

export type Reactive<T> = interfaces.Reactive<T>;
export const Reactive = {
  is<T>(
    value: unknown | interfaces.Reactive<T>
  ): value is interfaces.Reactive<T> {
    return typeof value === "object" && value !== null && REACTIVE in value;
  },
};
