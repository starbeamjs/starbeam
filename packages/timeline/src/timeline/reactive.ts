// eslint-disable-next-line import/no-duplicates
import type * as debug from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";

import type { InternalChildren } from "./internals.js";
import type { Timestamp } from "./timestamp.js";

export interface MutableInternals extends ReactiveProtocol {
  readonly type: "mutable";
  readonly description: debug.Description;
  readonly debug: { lastUpdated: Timestamp };
  children(): InternalChildren;
  isFrozen(): boolean;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface CompositeInternals extends ReactiveProtocol {
  readonly type: "composite";
  readonly description: debug.Description;
  readonly debug: { lastUpdated: Timestamp };
  children(): InternalChildren;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface StaticInternals extends ReactiveProtocol {
  readonly type: "static";
  readonly description: debug.Description;
  readonly debug: { lastUpdated: Timestamp };
  children(): InternalChildren;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export type ReactiveInternals =
  | MutableInternals
  | CompositeInternals
  | StaticInternals;

export type ReactiveProtocol = debug.ReactiveProtocol<ReactiveInternals>;

export interface Reactive<T> extends ReactiveProtocol {
  readonly current: T;
  read(stack: debug.Stack): T;
}

export const Reactive = {
  is<T>(value: unknown | Reactive<T>): value is Reactive<T> {
    return typeof value === "object" && value !== null && REACTIVE in value;
  },
};
