import type { Description } from "@starbeam/debug";
import type { Stack } from "@starbeam/interfaces";
import {
  type CompositeInternals,
  type DelegateInternals,
  type ReactiveProtocol,
  type StaticInternals,
  type Timestamp,
  TIMELINE,
} from "@starbeam/timeline";

export function StaticInternals(description?: Description): StaticInternals {
  return {
    type: "static",
    description,
  };
}

export function CompositeInternals(
  this: void,
  children: ReactiveProtocol[],
  description?: Description
): CompositeInternals {
  return {
    type: "composite",
    description,
    children: () => {
      return children;
    },
  };
}

export function DelegateInternals(
  this: void,
  delegate: readonly ReactiveProtocol[],
  description?: Description
): DelegateInternals {
  return {
    type: "delegate",
    description,
    delegate: [...delegate],
  };
}

export class MutableInternalsImpl implements MutableInternals {
  readonly type = "mutable";

  #frozen = false;
  #lastUpdated: Timestamp = TIMELINE.now;

  constructor(readonly description?: Description) {}

  get lastUpdated(): Timestamp {
    return this.#lastUpdated;
  }

  isFrozen(): boolean {
    return this.#frozen;
  }

  freeze(): void {
    this.#frozen = true;
  }

  update(caller: Stack): void {
    if (this.#frozen) {
      throw TypeError("Cannot update frozen object");
    }

    this.#lastUpdated = TIMELINE.bump(this, caller);
  }
}

export interface MutableInternals {
  readonly type: "mutable";
  readonly description?: Description;
  readonly lastUpdated: Timestamp;
  isFrozen?(): boolean;
}

export function MutableInternals(
  this: void,
  description?: Description
): MutableInternalsImpl {
  return new MutableInternalsImpl(description);
}
