import type { UNINITIALIZED } from "@starbeam/shared";

import type { Description } from "./description.js";
import type { FormulaCore, SubscriptionTarget } from "./protocol.js";

export interface ValidFrame<T> {
  readonly status: "valid";
  readonly value: T;
}

export interface InvalidFrame {
  readonly status: "invalid";
}

export type FrameValidation<T> = ValidFrame<T> | InvalidFrame;

export interface Frame<_T = unknown>
  extends SubscriptionTarget<FormulaCore> {
  readonly description: Description;

  validate: () => FrameValidation<Exclude<_T, UNINITIALIZED>>;
}
