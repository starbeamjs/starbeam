import type { REACTIVE } from "@starbeam/peer";

import type { Description } from "./description.js";
import type { Stack } from "./stack.js";
import type { Timestamp } from "./timestamp.js";

export interface MutableInternals {
  readonly type: "mutable";
  readonly description?: Description;
  readonly lastUpdated: Timestamp;
  isFrozen?(): boolean;
}

export interface CompositeInternals {
  readonly type: "composite";
  readonly description?: Description;
  children(): ReactiveProtocol[];
}

export interface DelegateInternals {
  readonly type: "delegate";
  readonly description?: Description;
  readonly delegate: ReactiveProtocol[];
}

export interface StaticInternals {
  readonly type: "static";
  readonly description?: Description;
}

export type ReactiveInternals =
  | MutableInternals
  | CompositeInternals
  | DelegateInternals
  | StaticInternals;

export interface ReactiveProtocol {
  [REACTIVE]: ReactiveInternals;
}

export interface Reactive<T> extends ReactiveProtocol {
  read(stack?: Stack): T;
}
