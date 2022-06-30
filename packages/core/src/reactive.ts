import { isObject } from "@starbeam/core-utils";
import type { Description } from "@starbeam/debug";
import {
  type ReactiveInternals,
  type ReactiveProtocol,
  REACTIVE,
} from "@starbeam/timeline";

export interface Reactive<T> extends ReactiveProtocol {
  readonly current: T;
}

export const Reactive = {
  is<T>(value: unknown | Reactive<T>): value is Reactive<T> {
    return isObject(value) && REACTIVE in value;
  },

  internals(reactive: ReactiveProtocol): ReactiveInternals {
    return reactive[REACTIVE];
  },

  description(reactive: ReactiveProtocol): Description {
    return Reactive.internals(reactive).description;
  },
};
