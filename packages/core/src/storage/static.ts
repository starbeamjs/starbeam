import {
  type CreateStaticDescription,
  StaticDescription,
} from "@starbeam/debug";
import type * as timeline from "@starbeam/timeline";
import {
  type ReactiveInternals,
  InternalChildren,
  REACTIVE,
  Timestamp,
} from "@starbeam/timeline";

export class StaticInternals implements timeline.StaticInternals {
  static create(
    description: StaticDescription | CreateStaticDescription
  ): StaticInternals {
    return new StaticInternals(StaticDescription.from(description));
  }

  readonly type = "static";
  readonly #description: StaticDescription;

  private constructor(description: StaticDescription) {
    this.#description = description;
  }

  readonly debug = { lastUpdated: Timestamp.initial() };

  get [REACTIVE](): ReactiveInternals {
    return this;
  }

  children(): InternalChildren {
    return InternalChildren.None();
  }

  get description(): StaticDescription {
    return this.#description;
  }

  isUpdatedSince(): boolean {
    return false;
  }
}
