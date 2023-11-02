import type * as interfaces from "@starbeam/interfaces";
import { bump as peerBump, now as peerNow } from "@starbeam/shared";
import { DisplayStruct } from "inspect-utils";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

class TimestampImpl implements interfaces.Timestamp {
  static #initial = peerNow();

  /**
   * Returns the current `Timestamp` according to @starbeam/shared
   */
  static now(): interfaces.Timestamp {
    return new TimestampImpl(peerNow());
  }

  /**
   * The earliest timestamp from @starbeam/shared that was visible to this @starbeam/timeline.
   */
  static zero(): interfaces.Timestamp {
    return new TimestampImpl(TimestampImpl.#initial);
  }

  static assert(
    timestamp: interfaces.Timestamp,
    what: string,
  ): asserts timestamp is TimestampImpl {
    if (!(#timestamp in timestamp)) {
      throw Error(`Value passed to ${what} was unexpectedly not a timestamp`);
    }
  }

  static debug(this: void, timestamp: interfaces.Timestamp): { at: number } {
    TimestampImpl.assert(timestamp, "Timestamp.debug");
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
    TimestampImpl.assert(other, "Timestamp#gt");

    return this.#timestamp > other.#timestamp;
  }

  eq(other: Timestamp): boolean {
    TimestampImpl.assert(other, "Timestamp#eq");

    return this.#timestamp === other.#timestamp;
  }

  /**
   * Bump the timestamp using `@starbeam/shared`
   */
  next(): Timestamp {
    return new Timestamp(peerBump());
  }

  toString = (options: { format?: "timestamp" } = {}): string => {
    if (options?.format === "timestamp") {
      return String(this.#timestamp);
    } else {
      return `#<Timestamp ${this.#timestamp}>`;
    }
  };
}

export function zero(): interfaces.Timestamp {
  return Timestamp.zero();
}

export function getNow(): interfaces.Timestamp {
  return Timestamp.now();
}

export type Timestamp = interfaces.Timestamp;
export const Timestamp = TimestampImpl;

export function max(
  ...timestamps: interfaces.Timestamp[]
): interfaces.Timestamp {
  return timestamps.reduce((a, b) => (a.gt(b) ? a : b), zero());
}

export class Now {
  #now = Timestamp.now();

  get now(): interfaces.Timestamp {
    return this.#now;
  }

  bump(): interfaces.Timestamp {
    return (this.#now = this.#now.next());
  }
}

export const NOW = new Now();
export const debug = Timestamp.debug;
