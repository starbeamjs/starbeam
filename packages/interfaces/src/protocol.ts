import type { REACTIVE } from "@starbeam/shared";

import type { Description } from "./description.js";
import type { Stack } from "./stack.js";
import type { Timestamp } from "./timestamp.js";

export type ReactiveId = number | string | ReactiveId[];

interface Internals {
  readonly type: string;
  readonly description: Description;
}

export interface MutableInternals extends Internals {
  readonly type: "mutable";
  readonly lastUpdated: Timestamp;
  isFrozen?(): boolean;
}

export interface CompositeInternals extends Internals {
  readonly type: "composite";
  children(): ReactiveProtocol[];
}

export interface DelegateInternals extends Internals {
  readonly type: "delegate";
  readonly delegate: readonly ReactiveProtocol[];
}

export interface StaticInternals extends Internals {
  readonly type: "static";
}

export type ReactiveInternals =
  | MutableInternals
  | CompositeInternals
  | DelegateInternals
  | StaticInternals;

export interface ReactiveProtocol<
  I extends ReactiveInternals = ReactiveInternals
> {
  [REACTIVE]: I;
}

export interface Reactive<T, I extends ReactiveInternals = ReactiveInternals>
  extends ReactiveProtocol<I> {
  read(stack?: Stack): T;
}
