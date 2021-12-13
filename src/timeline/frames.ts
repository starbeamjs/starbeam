import { AnyCell, IS_UPDATED_SINCE } from "../reactive/cell";
import { Timestamp } from "./timestamp";

export class ActiveFrame {
  readonly #cells = new Set<AnyCell>();

  add(cell: AnyCell): void {
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

export class FinalizedFrame<T> {
  readonly #cells: Set<AnyCell>;
  readonly #finalizedAt: Timestamp;
  readonly #value: T;

  constructor(cells: Set<AnyCell>, finalizedAt: Timestamp, value: T) {
    this.#cells = cells;
    this.#finalizedAt = finalizedAt;
    this.#value = value;
  }

  validate(): { status: "valid"; value: T } | { status: "invalid" } {
    for (let cell of this.#cells) {
      if (cell[IS_UPDATED_SINCE](this.#finalizedAt)) {
        return { status: "invalid" };
      }
    }

    return { status: "valid", value: this.#value };
  }
}
