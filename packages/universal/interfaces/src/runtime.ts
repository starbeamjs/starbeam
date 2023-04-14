import type { CallStack } from "./debug/call-stack.js";
import type { DebugRuntime } from "./debug/debug-runtime.js";
import type { CellTag, FormulaTag, Tag } from "./protocol.js";
import type { Timestamp } from "./timestamp.js";
import type { Unsubscribe } from "./utils.js";

export interface Runtime {
  readonly subscriptions: SubscriptionRuntime;
  readonly autotracking: AutotrackingRuntime;
  readonly debug: DebugRuntime | undefined;
}

export type NotifyReady = (internals: CellTag) => void;

export interface CoreRuntime {
  subscribe: (target: Tag, ready: NotifyReady) => Unsubscribe;
  bump: (cell: CellTag, update: (revision: Timestamp) => void) => void;
  update: (formula: FormulaTag) => void;

  start: () => { done: () => Set<Tag> };
  consume: (tag: Tag) => void;
}

export interface SubscriptionRuntime {
  subscribe: (target: CoreTag, ready: NotifyReady) => Unsubscribe;
  bump: (cell: CoreCellTag, update: (revision: Timestamp) => void) => void;
  update: (formula: CoreFormulaTag) => void;
}

export type ActiveFrame = () => Set<Tag>;

export interface CoreTag {
  readonly targets: ReadonlySet<CoreTag>;
  readonly dependencies: readonly CoreCellTag[] | undefined;
}
export interface CoreCellTag extends CoreTag {}
export interface CoreFormulaTag extends CoreTag {}
export type CoreSubscriptionTarget = CoreCellTag | CoreFormulaTag;

export interface AutotrackingRuntime {
  start: () => ActiveFrame;
  consume: (tag: CoreTag) => void;
}

export interface ActiveRuntimeFrame {
  done: () => RuntimeFrame;
}

export type RuntimeFrame = object;

export interface UpdateOptions {
  readonly caller: CallStack | undefined;
  readonly runtime: Runtime;
}

export interface TrackingStack {
  start: () => TrackingFrame;
}

export interface TrackingFrame {
  done: () => Set<Tag>;
}
