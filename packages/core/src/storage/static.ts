import type { Description } from "@starbeam/debug";
import {
  type ReactiveInternals,
  InternalChildren,
  REACTIVE,
} from "@starbeam/timeline";

export class StaticInternals {
  static create(description: Description): StaticInternals {
    return new StaticInternals(description);
  }

  readonly type = "static";
  readonly #description: Description;

  private constructor(description: Description) {
    this.#description = description;
  }

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
