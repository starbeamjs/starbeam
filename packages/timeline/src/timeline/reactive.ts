import type { Description } from "@starbeam/debug";

import type { InternalChildren } from "./internals.js";
import type { Timestamp } from "./timestamp.js";

export const REACTIVE = Symbol("REACTIVE");
export type REACTIVE = typeof REACTIVE;

export interface MutableInternals extends ReactiveProtocol {
  readonly type: "mutable";
  readonly description: Description;
  readonly debug: { lastUpdated: Timestamp };
  children(): InternalChildren;
  isFrozen(): boolean;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface CompositeInternals {
  readonly type: "composite";
  readonly description: Description;
  readonly debug: { lastUpdated: Timestamp };
  children(): InternalChildren;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface StaticInternals {
  readonly type: "static";
  readonly description: Description;
  readonly debug: { lastUpdated: Timestamp };
  children(): InternalChildren;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export type ReactiveInternals =
  | MutableInternals
  | CompositeInternals
  | StaticInternals;

export interface ReactiveProtocol {
  readonly [REACTIVE]: ReactiveInternals;
}

export interface Reactive<T> extends ReactiveProtocol {
  readonly current: T;
}
