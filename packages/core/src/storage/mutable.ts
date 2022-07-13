import {
  type Description,
  type Stack,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports
  ifDebug,
  inspector,
  isDebug,
} from "@starbeam/debug";
import type { Timestamp } from "@starbeam/timeline";
import {
  type ReactiveProtocol,
  InternalChildren,
  REACTIVE,
  TIMELINE,
} from "@starbeam/timeline";

export class MutableInternalsImpl implements ReactiveProtocol {
  static {
    if (isDebug()) {
      inspector(this, "MutableInternals").define((internals, debug) =>
        debug.struct(
          {
            frozen: internals.#frozen,
            lastUpdate: String(internals.#lastUpdate),
          },
          {
            description: internals.#description.fullName,
          }
        )
      );
    }
  }

  static create(description: Description): MutableInternalsImpl {
    return new MutableInternalsImpl(false, TIMELINE.now, description);
  }

  static described(description: Description): MutableInternalsImpl {
    return new MutableInternalsImpl(false, TIMELINE.now, description);
  }

  readonly type = "mutable";

  #frozen: boolean;
  #lastUpdate: Timestamp;
  #description: Description;

  private constructor(
    frozen: boolean,
    lastUpdate: Timestamp,
    description: Description
  ) {
    this.#frozen = frozen;
    this.#lastUpdate = lastUpdate;
    this.#description = description;
  }

  get [REACTIVE]() {
    return this;
  }

  @ifDebug
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

  consume(caller: Stack | undefined): void {
    if (!this.#frozen) {
      TIMELINE.didConsume(this, caller);
    }
  }

  update(): void {
    if (this.#frozen) {
      throw TypeError(
        `Cannot update a frozen reactive object (${this.#description.fullName})`
      );
    }

    this.#lastUpdate = TIMELINE.bump(this);
  }

  freeze(): void {
    this.#frozen = true;
  }

  /** impl ReactiveInternals */
  get description(): Description {
    return this.#description;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.#lastUpdate.gt(timestamp);
  }
}
