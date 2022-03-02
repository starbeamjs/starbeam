import {
  LEAF,
  TIMELINE,
  Timestamp,
  type MutableInternals,
} from "@starbeam/timeline";
import { expected, isValue, verify } from "@starbeam/verify";

export class MutableInternalsImpl implements MutableInternals {
  static create(description: string): MutableInternalsImpl {
    return new MutableInternalsImpl(false, TIMELINE.now, description);
  }

  readonly type = "mutable";

  #frozen: boolean;
  #lastUpdate: Timestamp;
  readonly #description: string;

  private constructor(
    frozen: boolean,
    lastUpdate: Timestamp,
    description: string
  ) {
    this.#frozen = frozen;
    this.#lastUpdate = lastUpdate;
    this.#description = description;
  }

  get debug(): { readonly lastUpdated: Timestamp } {
    return { lastUpdated: this.#lastUpdate };
  }

  isFrozen(): boolean {
    return this.#frozen;
  }

  consume(): void {
    if (!this.#frozen) {
      TIMELINE.didConsume(this);
    }
  }

  update(): void {
    verify(
      this.#frozen,
      isValue(false),
      expected(`a cell`)
        .toBe(`non-frozen`)
        .when(`updating a cell`)
        .butGot(() => `a frozen cell`)
    );

    this.#lastUpdate = TIMELINE.bump(this);
  }

  freeze(): void {
    this.#frozen = true;
  }

  /** impl ReactiveInternals */
  get description(): string {
    return this.#description;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.#lastUpdate.gt(timestamp);
  }

  dependencies(): LEAF {
    return LEAF;
  }
}
