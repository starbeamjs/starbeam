import { IS_UPDATED_SINCE } from "../brands";
import type { AnyCell } from "../reactive/cell";
import { HasMetadata, ReactiveMetadata } from "../reactive/metadata";
import type { Timestamp } from "./timestamp";

export class ActiveFrame {
  readonly #cells = new Set<AnyCell | AnyFinalizedFrame>();

  add(cell: AnyCell | AnyFinalizedFrame): void {
    this.#cells.add(cell);
  }

  finalize<T>(
    value: T,
    now: Timestamp
  ): { frame: FinalizedFrame<T>; initial: T } {
    return {
      frame: new FinalizedFrame(this.#cells, now, value),
      initial: value,
    };
  }
}

export class FinalizedFrame<T> extends HasMetadata {
  readonly #children: Set<AnyCell | AnyFinalizedFrame>;
  readonly #finalizedAt: Timestamp;
  readonly #value: T;

  constructor(
    children: Set<AnyCell | AnyFinalizedFrame>,
    finalizedAt: Timestamp,
    value: T
  ) {
    super();
    this.#children = children;
    this.#finalizedAt = finalizedAt;
    this.#value = value;
  }

  get metadata(): ReactiveMetadata {
    return ReactiveMetadata.all(...this.#children);
  }

  [IS_UPDATED_SINCE](timestamp: Timestamp): boolean {
    for (let child of this.#children) {
      if (child[IS_UPDATED_SINCE](timestamp)) {
        return true;
      }
    }

    return false;
  }

  validate(): { status: "valid"; value: T } | { status: "invalid" } {
    if (this[IS_UPDATED_SINCE](this.#finalizedAt)) {
      return { status: "invalid" };
    }

    return { status: "valid", value: this.#value };
  }
}

export type AnyFinalizedFrame = FinalizedFrame<unknown>;
