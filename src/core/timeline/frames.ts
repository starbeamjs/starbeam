import { HasMetadata, ReactiveMetadata } from "../metadata.js";
import type {
  Cell as CellType,
  ReactiveMetadata as ReactiveMetadataType,
} from "../../fundamental/types.js";
import { LOGGER } from "../../strippable/trace.js";
import type { IsUpdatedSince, Timestamp } from "./timestamp.js";
import { IS_UPDATED_SINCE } from "../../fundamental/constants.js";

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

  readonly #cells: Set<CellType | FinalizedFrame>;

  private constructor(
    cells: Set<CellType | FinalizedFrame>,
    readonly description: string
  ) {
    this.#cells = cells;
  }

  add(cell: CellType | FinalizedFrame): void {
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

export class FinalizedFrame<T = unknown>
  extends HasMetadata
  implements IsUpdatedSince
{
  readonly #children: Set<CellType | FinalizedFrame>;
  readonly #finalizedAt: Timestamp;
  readonly #value: T;

  constructor(
    children: Set<CellType | FinalizedFrame>,
    finalizedAt: Timestamp,
    value: T,
    readonly description?: string
  ) {
    super();
    this.#children = children;
    this.#finalizedAt = finalizedAt;
    this.#value = value;
  }

  get metadata(): ReactiveMetadataType {
    return ReactiveMetadata.all(...this.#children);
  }

  get cells(): readonly CellType<unknown>[] {
    return [...this.#children].flatMap((child) =>
      child instanceof FinalizedFrame ? child.cells : child
    );
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
