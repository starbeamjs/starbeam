import type { Description } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import type { Tagged } from "@starbeam/timeline";
import { TIMELINE, type Timestamp } from "@starbeam/timeline";

export function StaticInternals(
  description: Description
): interfaces.StaticTag {
  return {
    type: "static",
    description,
  };
}

export function CompositeInternals(
  this: void,
  children: Tagged[],
  description: Description
): interfaces.FormulaTag {
  return {
    type: "formula",
    description,
    children: () => {
      return children;
    },
  };
}

export function DelegateInternals(
  this: void,
  delegate: readonly Tagged[],
  description: Description
): interfaces.DelegateTag {
  return {
    type: "delegate",
    description,
    targets: [...delegate],
  };
}

export class MutableInternalsImpl implements interfaces.CellTag {
  #frozen = false;
  #lastUpdated: Timestamp = TIMELINE.now;
  readonly type = "mutable";

  constructor(readonly description: Description) {}

  get lastUpdated(): Timestamp {
    return this.#lastUpdated;
  }

  isFrozen(): boolean {
    return this.#frozen;
  }

  freeze(): void {
    this.#frozen = true;
  }

  update(caller: interfaces.Stack): void {
    if (this.#frozen) {
      throw TypeError("Cannot update frozen object");
    }

    this.#lastUpdated = TIMELINE.bump(this, caller);
  }
}

export function MutableInternals(
  this: void,
  description: Description
): MutableInternalsImpl {
  return new MutableInternalsImpl(description);
}

export type MutableInternals = interfaces.CellTag;
