import type { Unsubscribe } from "./aliases.js";
import type { CellTag, FormulaTag, Tag } from "./protocol.js";
import type { Stack as CallStack } from "./stack.js";
import type { Timestamp } from "./timestamp.js";

/**
 * @deprecated
 */
export interface DeprecatedTimeline {
  bumpCell: (cell: CellTag, caller: CallStack) => Timestamp;
  didConsumeCell: (cell: CellTag, caller: CallStack) => void;
}

export interface Runtime {
  callerStack: () => CallStack;
  readonly subscriptions: SubscriptionRuntime;
  readonly autotracking: AutotrackingRuntime;
  readonly debug: DebugRuntime;
}

export interface SubscriptionRuntime {
  subscribe: (target: Tag, ready: NotifyReady) => Unsubscribe;
  bump: (cell: CellTag) => { revision: Timestamp; notify: () => void };
  update: (formula: FormulaTag) => void;
}

export interface DebugRuntime {
  untrackedReadBarrier: (
    barrier: (tag: Tag, stack: CallStack) => void | never
  ) => void;
}

export type ActiveFrame = () => Set<Tag>;

export interface AutotrackingRuntime {
  start: () => ActiveFrame;
  consume: (tag: Tag) => void;
}

export interface ActiveRuntimeFrame {
  done: () => RuntimeFrame;
}

export type RuntimeFrame = object;

export interface UpdateOptions {
  readonly caller: CallStack;
  readonly runtime: Runtime;
}

export interface TrackingStack {
  start: () => TrackingFrame;
}

export interface TrackingFrame {
  done: () => Set<Tag>;
}
