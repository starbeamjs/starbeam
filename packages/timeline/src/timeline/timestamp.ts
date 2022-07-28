// eslint-disable-next-line unused-imports/no-unused-imports, @typescript-eslint/no-unused-vars
import { DisplayStruct, ifDebug } from "@starbeam/debug";
// import type { IS_UPDATED_SINCE } from "../../fundamental/constants.js";
// import { INSPECT } from "../../utils.js";
import { bump as peerBump, now as peerNow } from "@starbeam/peer";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class Timestamp {
  static #initial = peerNow();

  /**
   * Returns the current `Timestamp` according to @starbeam/peer
   */
  static now(): Timestamp {
    return new Timestamp(peerNow());
  }

  /**
   * The earliest timestamp from @starbeam/peer that was visible to this @starbeam/timeline.
   */
  static zero(): Timestamp {
    return new Timestamp(Timestamp.#initial);
  }

  static max(...timestamps: Timestamp[]): Timestamp {
    return timestamps.reduce((a, b) => (a.gt(b) ? a : b), Timestamp.zero());
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
    return this.#timestamp > other.#timestamp;
  }

  eq(other: Timestamp): boolean {
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
