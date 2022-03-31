import {
  InternalChildren,
  REACTIVE,
  type ReactiveInternals,
  type StaticInternals,
  type Timestamp,
} from "@starbeam/timeline";

export class StaticInternalsImpl implements StaticInternals {
  static create(description: string): StaticInternals {
    return new StaticInternalsImpl(description);
  }

  readonly type = "static";
  readonly #description: string;

  private constructor(description: string) {
    this.#description = description;
  }

  get [REACTIVE](): ReactiveInternals {
    return this;
  }

  children(): InternalChildren {
    return InternalChildren.None();
  }

  /** impl ReactiveInternals */
  get description(): string {
    return this.#description;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return false;
  }
}
