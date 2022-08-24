// eslint-disable-next-line unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars
import { DisplayStruct, ifDebug } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
// import type { IS_UPDATED_SINCE } from "../../fundamental/constants.js";
// import { INSPECT } from "../../utils.js";
import { bump as peerBump, now as peerNow } from "@starbeam/peer";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class TimestampImpl implements interfaces.Timestamp {
  static #initial = peerNow();

  /**
   * Returns the current `Timestamp` according to @starbeam/peer
   */
  static now(): interfaces.Timestamp {
    return new TimestampImpl(peerNow());
  }

  /**
   * The earliest timestamp from @starbeam/peer that was visible to this @starbeam/timeline.
   */
  static zero(): interfaces.Timestamp {
    return new TimestampImpl(TimestampImpl.#initial);
  }

  static assert(
    timestamp: interfaces.Timestamp,
    what: string
  ): asserts timestamp is TimestampImpl {
    if (!(#timestamp in timestamp)) {
      throw Error(`Value passed to ${what} was unexpectedly not a timestamp`);
    }
  }

  static debug(timestamp: interfaces.Timestamp): { at: number } {
    TimestampImpl.assert(timestamp, "Timestamp.debug");
    return { at: timestamp.#timestamp };
  }

  readonly #timestamp: number;

  constructor(timestamp: number) {
    this.#timestamp = timestamp;
  }

  @ifDebug
  [INSPECT](): object {
    return DisplayStruct("Timestamp", { at: this.#timestamp });
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
   * Bump the timestamp using `@starbeam/peer`
   */
  next(): Timestamp {
    return new Timestamp(peerBump());
  }

  toString = (): string => {
    return `#<Timestamp ${this.#timestamp}>`;
  };
}

export function zero(): interfaces.Timestamp {
  return Timestamp.zero();
}

export function now(): interfaces.Timestamp {
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
