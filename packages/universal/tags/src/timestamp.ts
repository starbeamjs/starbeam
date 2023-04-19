import { DisplayStruct } from "@starbeam/core-utils";
import type { CoreTimestamp } from "@starbeam/interfaces";
import { bump as peerBump, now as peerNow } from "@starbeam/shared";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

const initial = peerNow();

export class Timestamp implements CoreTimestamp {
  readonly #timestamp: number;
  declare [INSPECT]: () => object;

  constructor(timestamp: number) {
    this.#timestamp = timestamp;

    if (import.meta.env.DEV) {
      this[INSPECT] = (): object =>
        DisplayStruct("Timestamp", { at: this.#timestamp });
    }
  }

  get at(): number {
    return this.#timestamp;
  }

  gt(other: Timestamp): boolean {
    return this.#timestamp > other.#timestamp;
  }

  eq(other: Timestamp): boolean {
    return this.#timestamp === other.#timestamp;
  }

  /**
   * Bump the timestamp using `@starbeam/shared`
   */
  next(): Timestamp {
    return new Timestamp(peerBump());
  }

  toString = (options: { format?: "timestamp" } = {}): string => {
    if (options.format === "timestamp") {
      return String(this.#timestamp);
    } else {
      return `#<Timestamp ${this.#timestamp}>`;
    }
  };
}

/**
 * The earliest timestamp from @starbeam/shared that was visible to this @starbeam/timeline.
 */
export function zero(): Timestamp {
  return new Timestamp(initial);
}

let now = zero();

export const NOW = {
  get now(): Timestamp {
    return now;
  },
  bump(): Timestamp {
    return (now = now.next());
  },
};
