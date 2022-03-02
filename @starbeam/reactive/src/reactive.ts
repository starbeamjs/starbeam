import { Abstraction } from "@starbeam/debug";
import {
  REACTIVE,
  ReactiveInternals,
  type MutableInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";
import { Enum } from "@starbeam/utils";
import { Static } from "./core/static.js";

export interface ReactiveValue<T> extends ReactiveProtocol {
  readonly current: T;
}

export class ReactiveDependencies extends Enum(
  "Constant",
  "Uninitialized",
  "Stable(T)",
  "Derived(U)"
)<MutableInternals, readonly MutableInternals[]> {
  get dependencies(): readonly MutableInternals[] {
    return this.match({
      Constant: () => [],
      Derived: (dependencies) => dependencies,
      Stable: (dependency) => [dependency],
      Uninitialized: () => [],
    });
  }
}

// /**
//  * The Reactive will not change anymore, and therefore has no dependencies
//  */
// interface Constant {
//   readonly type: "constant";
// }

// const CONSTANT = { type: "constant" } as const;

// /**
//  * The Reactive has not yet been initialized, and therefore has no dependencies
//  * *yet*. Initialization counts as a state change that will invalidate the
//  * Reactive.
//  */
// interface Uninitialized {
//   readonly type: "uninitialized";
// }

// const UNINITIALIZED = { type: "uninitialized" } as const;

// /**
//  * The Reactive represents a single, stable dependency (i.e. a Cell or Marker).
//  * It can still become frozen, but the MutableInternals object cannot change.
//  * This stable MutableInternals can be used to subscribe to TIMELINE changes.
//  */
// interface Stable {
//   readonly type: "stable";
//   readonly dependency: MutableInternals;
// }

// /**
//  * The Reactive is a derived value that has already been initialized. Its list
//  * of dependencies may change, and any change to the list of dependencies counts
//  * as a state change.
//  */
// interface Derived {
//   readonly type: "derived";
//   readonly dependencies: readonly MutableInternals[];
// }

// export type ReactiveDependencies = Constant | Stable | Derived | Uninitialized;

export type Reactive<T> = ReactiveValue<T>;

export const Reactive = new (class {
  description(value: ReactiveProtocol): string {
    return value[REACTIVE].description;
  }

  isConstant(value: ReactiveProtocol): boolean {
    return Reactive.getDependencies(value).matches("Constant");
  }

  isDynamic(value: ReactiveProtocol): boolean {
    return !Reactive.isConstant(value);
  }

  getDependencies(value: ReactiveProtocol): ReactiveDependencies {
    const internals = ReactiveInternals.classify(value[REACTIVE]);

    switch (internals.type) {
      case "static":
        return ReactiveDependencies.Constant();
      case "mutable":
        return ReactiveDependencies.Stable(internals);
      case "derived": {
        if (internals.state === "uninitialized") {
          return ReactiveDependencies.Uninitialized();
        }

        const dependencies = internals.dependencies();

        if (dependencies.length === 0) {
          // Once dependencies has become empty, the derived can't change
          // anymore.
          //
          // One way this can happen is if all of the previous dependencies
          // became frozen.
          //
          // But even this would be sufficient:
          //
          // ```ts
          // const bool = Cell(false);
          // const name = Cell("@tomdale");
          // const anonymous = Static("@anonymous");
          //
          // const memo = Memo(() => bool.current ? name.current : anonymous.current);
          // memo.current //? "@anonymous"
          //
          // bool.freeze();
          // memo.current //? "@anonymous"
          // ```
          //
          // `memo` is now constant because `bool` can't change anymore, and the
          // last code path had no other dependencies.
          return ReactiveDependencies.Constant();
        } else {
          return ReactiveDependencies.Derived(dependencies);
        }
      }
    }
  }

  is<R extends ReactiveProtocol>(value: unknown | R): value is R {
    if (typeof value === "object" && value !== null) {
      return REACTIVE in value;
    } else {
      return false;
    }
  }

  from<T>(
    value: T | ReactiveValue<T>,
    description = Abstraction.callerFrame()
  ): ReactiveValue<T> {
    if (Reactive.is(value)) {
      return value;
    }

    return Static(value, description);
  }
})();
