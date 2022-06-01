import {
  type ReactiveInternals,
  InternalChildren,
  REACTIVE,
} from "@starbeam/timeline";

export class StaticInternals {
  static create(description: string): StaticInternals {
    return new StaticInternals(description);
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

  get description(): string {
    return this.#description;
  }

  isUpdatedSince(): boolean {
    return false;
  }
}
