import type { Description } from "./reactive-value.js";

export class Mutation {
  static describe(reason: string) {
    return new Mutation(reason);
  }

  static from(reason: string | Mutation) {
    if (typeof reason === "string") {
      return new Mutation(reason);
    } else {
      return reason;
    }
  }

  #reason: string;

  private constructor(reason: string) {
    this.#reason = reason;
  }

  get reason() {
    return this.#reason;
  }
}

export class MutationDescription {
  static describe(values: Description[], reason: string | Mutation) {
    return new MutationDescription(values, Mutation.from(reason));
  }

  #values: Description[];
  #description: Mutation;

  private constructor(values: Description[], description: Mutation) {
    this.#values = values;
    this.#description = description;
  }
}
