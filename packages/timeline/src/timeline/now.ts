import { Timestamp } from "./timestamp.js";

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
