export interface IsUpdatedSince {
  IS_UPDATED_SINCE(timestamp: Timestamp): boolean;
}

export class Timestamp {
  static initial(): Timestamp {
    return new Timestamp(1);
  }

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

  toString() {
    return `#<Timestamp ${this.#timestamp}>`;
  }
}
