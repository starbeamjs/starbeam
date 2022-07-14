import type { Description } from "@starbeam/debug";
import type * as timeline from "@starbeam/timeline";
import {
  type ReactiveInternals,
  InternalChildren,
  REACTIVE,
  Timestamp,
} from "@starbeam/timeline";

export class StaticInternals implements timeline.StaticInternals {
  static create(this: void, description: Description): StaticInternals {
    return new StaticInternals(description);
  }

  readonly type = "static";
  readonly #description: Description;

  private constructor(description: Description) {
    this.#description = description;
  }

  readonly debug = { lastUpdated: Timestamp.zero() };

  get [REACTIVE](): ReactiveInternals {
    return this;
  }

  children(): InternalChildren {
    return InternalChildren.None();
  }

  get description(): Description {
    return this.#description;
  }

  isUpdatedSince(): boolean {
    return false;
  }
}

export const Static: (description: Description) => Static =
  StaticInternals.create;
export type Static = StaticInternals;
