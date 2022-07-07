import type { Description, Stack } from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";

import type { InternalChildren } from "./internals.js";
import type { Timestamp } from "./timestamp.js";

import type * as debug from "@starbeam/debug";

export interface MutableInternals extends ReactiveProtocol {
  readonly type: "mutable";
  readonly description: Description;
  readonly debug: { lastUpdated: Timestamp };
  children(): InternalChildren;
  isFrozen(): boolean;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface CompositeInternals extends ReactiveProtocol {
  readonly type: "composite";
  readonly description: Description;
  readonly debug: { lastUpdated: Timestamp };
  children(): InternalChildren;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface StaticInternals extends ReactiveProtocol {
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

export interface ReactiveProtocol
  extends debug.ReactiveProtocol<ReactiveInternals> {}

export interface Reactive<T> extends ReactiveProtocol {
  readonly current: T;
  read(stack: Stack): T;
}

export const Reactive = {
  is<T>(value: unknown | Reactive<T>): value is Reactive<T> {
    return typeof value === "object" && value !== null && REACTIVE in value;
  },
};
