import type { UNINITIALIZED } from "@starbeam/peer";

import type { Description } from "./description.js";
import type { CompositeInternals, ReactiveProtocol } from "./protocol.js";

export interface ValidFrame<T> {
  readonly status: "valid";
  readonly value: T;
}

export interface InvalidFrame {
  readonly status: "invalid";
}

export type FrameValidation<T> = ValidFrame<T> | InvalidFrame;

export interface Frame<_T = unknown>
  extends ReactiveProtocol<CompositeInternals> {
  readonly description: Description;

  validate<U>(this: Frame<U | UNINITIALIZED>): FrameValidation<U>;

  // update<U>(
  //   this: Frame<U | UNINITIALIZED>,
  //   value: U,
  //   children: Set<ReactiveProtocol>,
  //   finalized: Timestamp
  // ): Frame<U>;
  // update(
  //   value: T,
  //   children: Set<ReactiveProtocol>,
  //   finalized: Timestamp
  // ): Frame<T>;
  // update(
  //   value: T,
  //   children: Set<ReactiveProtocol>,
  //   finalized: Timestamp
  // ): Frame<T> {
  //   if (Object.is(this.#value, UNINITIALIZED)) {
  //     this.#initialized[REACTIVE].lastUpdated = finalized;
  //   }

  //   this.#value = value;
  //   this.#children = children;
  //   this.#finalized = finalized;
  //   return this;
  // }

  // validate<U>(this: Frame<U | UNINITIALIZED>): FrameValidation<U> {
  //   if (
  //     Object.is(this.#value, UNINITIALIZED) ||
  //     ReactiveProtocol.lastUpdatedIn([...this.#children]).gt(this.#finalized)
  //   ) {
  //     return { status: "invalid" };
  //   } else {
  //     return { status: "valid", value: this.#value as U };
  //   }
  // }
}
