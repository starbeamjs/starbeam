import type { ReactiveInternals, Timestamp } from "@starbeam/timeline";

export class UninitializedInternalsImpl implements ReactiveInternals {
  static create(description: string): UninitializedInternalsImpl {
    return new UninitializedInternalsImpl(description);
  }

  readonly type = "uninitialized";
  readonly #description: string;

  private constructor(description: string) {
    this.#description = description;
  }

  /** impl ReactiveInternals */
  get description(): string {
    return this.#description;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return false;
  }
}
