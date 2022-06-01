import type { ReactiveProtocol } from "@starbeam/timeline";

export interface Reactive<T> extends ReactiveProtocol {
  readonly current: T;
}
