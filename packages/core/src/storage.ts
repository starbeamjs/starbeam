import type { Description } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import {
  type ReactiveProtocol,
  type Timestamp,
  TIMELINE,
} from "@starbeam/timeline";

export function StaticInternals(
  description: Description
): interfaces.StaticInternals {
  return {
    type: "static",
    description,
  };
}

export function CompositeInternals(
  this: void,
  children: ReactiveProtocol[],
  description: Description
): interfaces.CompositeInternals {
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
  description: Description
): interfaces.DelegateInternals {
  return {
    type: "delegate",
    description,
    delegate: [...delegate],
  };
}

export class MutableInternalsImpl implements interfaces.MutableInternals {
  readonly type = "mutable";

  #frozen = false;
  #lastUpdated: Timestamp = TIMELINE.now;

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

export type MutableInternals = interfaces.MutableInternals;
