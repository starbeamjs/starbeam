export class Timestamp {
  readonly #timestamp: number;

  constructor(timestamp: number) {
    this.#timestamp = timestamp;
  }

  gt(other: Timestamp) {
    return this.#timestamp > other.#timestamp;
  }

  next(): Timestamp {
    return new Timestamp(this.#timestamp + 1);
  }
}
