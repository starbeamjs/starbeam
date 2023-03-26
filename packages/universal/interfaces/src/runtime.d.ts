import type { Unsubscribe } from "./aliases.js";
import type { Description } from "./description.js";
import type { CellTag, Tag, Tagged } from "./protocol.js";
import type { Stack as CallStack } from "./stack.js";
import type { Timestamp } from "./timestamp.js";

export interface Runtime {
  callerStack: () => CallStack;
  didConsumeCell: (cell: Tagged<CellTag>, caller: CallStack) => void;
  bumpCell: (cell: CellTag, caller: CallStack) => Timestamp;
  creatingFrame: (description: Description) => ActiveRuntimeFrame;
  updatingFrame: (
    description: Description,
    frame: RuntimeFrame
  ) => ActiveRuntimeFrame;
  readonly subscriptions: SubscriptionRuntime;
  readonly autotracking: AutotrackingRuntime;
}

export interface SubscriptionRuntime {
  subscribe: (target: Tag, ready: NotifyReady) => Unsubscribe;
  bump: (cell: CellTag) => Timestamp;
  update: (formula: FormulaTag) => void;
}

export interface AutotrackingRuntime {
  start: () => () => Set<Tag>;
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
