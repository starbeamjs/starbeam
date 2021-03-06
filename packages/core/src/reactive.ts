import { isObject } from "@starbeam/core-utils";
import { type Description, type Stack, Tree } from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";
import type {
  MutableInternals,
  ReactiveInternals,
  ReactiveProtocol,
} from "@starbeam/timeline";

export interface Reactive<T> extends ReactiveProtocol {
  /**
   * The `current` property is treated as a user-facing entry point, and its consumption is reported
   * from the direct caller of `current`.
   */
  readonly current: T;
  /**
   * The `read` method is an internal entry point, and callers to `read` are expected to propagate the
   * user-facing call stack.
   */
  read(caller: Stack): T;
}

export const Reactive = {
  is<T>(value: unknown | Reactive<T>): value is Reactive<T> {
    return isObject(value) && REACTIVE in value;
  },

  dependencies(reactive: ReactiveProtocol): Set<MutableInternals> {
    return Reactive.internals(reactive).children().dependencies;
  },

  internals(reactive: ReactiveProtocol): ReactiveInternals {
    return reactive[REACTIVE];
  },

  description(reactive: ReactiveProtocol): Description {
    return Reactive.internals(reactive).description;
  },

  debug(
    reactive: ReactiveProtocol,
    {
      implementation = false,
      source = false,
    }: { implementation?: boolean; source?: boolean } = {}
  ): string {
    const dependencies = [...reactive[REACTIVE].children().dependencies];
    const descriptions = new Set(
      dependencies.map((dependency) => {
        return implementation
          ? dependency.description
          : dependency.description.userFacing;
      })
    );

    const nodes = [...descriptions].map((d) => {
      const description = implementation ? d : d.userFacing;
      return description.describe({ source });
    });

    return Tree(...nodes).format();
  },
};
