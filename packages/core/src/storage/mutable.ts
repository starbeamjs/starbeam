import { inspector } from "@starbeam/debug";
import type { Timestamp } from "@starbeam/timeline";
import {
  type ReactiveProtocol,
  InternalChildren,
  REACTIVE,
  TIMELINE,
} from "@starbeam/timeline";

export class MutableInternalsImpl implements ReactiveProtocol {
  static {
    inspector(this, "MutableInternals").define((internals, debug) =>
      debug.struct(
        {
          frozen: internals.#frozen,
          lastUpdate: internals.#lastUpdate,
        },
        {
          description: internals.#description,
        }
      )
    );
  }

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

  get [REACTIVE]() {
    return this;
  }

  get debug(): { readonly lastUpdated: Timestamp } {
    return { lastUpdated: this.#lastUpdate };
  }

  children(): InternalChildren {
    if (this.#frozen) {
      return InternalChildren.None();
    } else {
      return InternalChildren.Children([this]);
    }
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
    if (this.#frozen) {
      throw TypeError(
        `Cannot update a frozen reactive object (${this.description})`
      );
    }

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
}
