import { IS_UPDATED_SINCE } from "../brands";
import type { AnyCell } from "../reactive/cell";
import { HasMetadata, ReactiveMetadata } from "../reactive/metadata";
import { LOGGER } from "../strippable/trace";
import type { Timestamp } from "./timestamp";

export class AssertFrame {
  static describing(description: string): AssertFrame {
    return new AssertFrame(description);
  }

  readonly #description: string;

  private constructor(description: string) {
    this.#description = description;
  }

  assert(): void {
    throw Error(
      `The current timestamp should not change while ${this.#description}`
    );
  }
}

export class ActiveFrame {
  static create(description: string): ActiveFrame {
    return new ActiveFrame(new Set(), description);
  }

  readonly #cells: Set<AnyCell | AnyFinalizedFrame>;

  private constructor(
    cells: Set<AnyCell | AnyFinalizedFrame>,
    readonly description: string
  ) {
    this.#cells = cells;
  }

  add(cell: AnyCell | AnyFinalizedFrame): void {
    this.#cells.add(cell);
  }

  finalize<T>(
    value: T,
    now: Timestamp
  ): { frame: FinalizedFrame<T>; initial: T } {
    return {
      frame: new FinalizedFrame(this.#cells, now, value, this.description),
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
    value: T,
    readonly description?: string
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
    let isUpdated = false;

    for (let child of this.#children) {
      if (child[IS_UPDATED_SINCE](timestamp)) {
        LOGGER.trace.log(
          `[invalidated] by ${child.description || "anonymous"}`
        );
        isUpdated = true;
      }
    }

    return isUpdated;
  }

  validate(): { status: "valid"; value: T } | { status: "invalid" } {
    if (this[IS_UPDATED_SINCE](this.#finalizedAt)) {
      return { status: "invalid" };
    }

    return { status: "valid", value: this.#value };
  }
}

export type AnyFinalizedFrame = FinalizedFrame<unknown>;
