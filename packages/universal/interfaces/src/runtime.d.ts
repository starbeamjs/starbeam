import type { Description } from "./description.js";
import type { CellTag, Tagged } from "./protocol.js";
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
