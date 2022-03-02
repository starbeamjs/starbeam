import { DisplayStruct } from "@starbeam/debug";
// import type { IS_UPDATED_SINCE } from "../../fundamental/constants.js";
// import { INSPECT } from "../../utils.js";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class Timestamp {
  static initial(): Timestamp {
    return new Timestamp(1);
  }

  readonly #timestamp: number;

  constructor(timestamp: number) {
    this.#timestamp = timestamp;
  }

  [INSPECT]() {
    return DisplayStruct("Timestamp", { at: this.#timestamp });
  }

  gt(other: Timestamp) {
    return this.#timestamp > other.#timestamp;
  }

  next(): Timestamp {
    return new Timestamp(this.#timestamp + 1);
  }

  toString() {
    return `#<Timestamp ${this.#timestamp}>`;
  }
}
