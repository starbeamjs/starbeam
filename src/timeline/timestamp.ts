export class Timestamp {
  readonly #timestamp: number;

  constructor(timestamp: number) {
    this.#timestamp = timestamp;
  }

  next(): Timestamp {
    return new Timestamp(this.#timestamp + 1);
  }
}
