import type { ReactiveProtocol } from "@starbeam/timeline";

export interface ReactiveValue<T> extends ReactiveProtocol {
  readonly current: T;
}
