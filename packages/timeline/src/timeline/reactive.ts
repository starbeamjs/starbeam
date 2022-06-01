import type { InternalChildren } from "./internals.js";
import type { Timestamp } from "./timestamp.js";

export const REACTIVE = Symbol("REACTIVE");
export type REACTIVE = typeof REACTIVE;

export interface MutableInternals {
  readonly type: "mutable";
  readonly description: string;
  children(): InternalChildren;
  isFrozen(): boolean;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface CompositeInternals {
  readonly type: "composite";
  readonly description: string;
  children(): InternalChildren;
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export interface StaticInternals {
  readonly type: "static";
  readonly description: string;
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
