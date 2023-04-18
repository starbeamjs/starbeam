import { DisplayStruct } from "@starbeam/core-utils";
import type { CoreTimestamp } from "@starbeam/interfaces";
import { bump as peerBump, now as peerNow } from "@starbeam/shared";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class Timestamp implements CoreTimestamp {
  static #initial = peerNow();

  /**
   * Returns the current `Timestamp` according to @starbeam/shared
   */
  static now(this: void): Timestamp {
    return new Timestamp(peerNow());
  }

  /**
   * The earliest timestamp from @starbeam/shared that was visible to this @starbeam/timeline.
   */
  static zero(this: void): Timestamp {
    return new Timestamp(Timestamp.#initial);
  }

  static assert(
    timestamp: Timestamp,
    what: string
  ): asserts timestamp is Timestamp {
    if (!(#timestamp in timestamp)) {
      throw Error(`Value passed to ${what} was unexpectedly not a timestamp`);
    }
  }

  static debug(this: void, timestamp: Timestamp): { at: number } {
    Timestamp.assert(timestamp, "Timestamp.debug");
    return { at: timestamp.#timestamp };
  }

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
    Timestamp.assert(other, "Timestamp#gt");

    return this.#timestamp > other.#timestamp;
  }

  eq(other: Timestamp): boolean {
    Timestamp.assert(other, "Timestamp#eq");

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

export const zero = Timestamp.zero;

export class Now {
  #now = Timestamp.now();

  get now(): Timestamp {
    return this.#now;
  }

  bump(): Timestamp {
    return (this.#now = this.#now.next());
  }
}

export const NOW = new Now();
export const debug = Timestamp.debug;
