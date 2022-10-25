import { FormulaFn } from "@starbeam/universal";

export class Invalidation<T> {
  static trace<T>(formula: () => T): Invalidation<T> {
    return new Invalidation(formula);
  }

  #bumped = 0;
  #formula: FormulaFn<T>;
  #lastChecked = 0;
  #initialized = false;

  constructor(formula: () => T) {
    this.#formula = FormulaFn(() => {
      this.#bumped++;
      return formula();
    });
  }

  get state(): [value: T, state: "initialized" | "stable" | "invalidated"] {
    const current = this.current;

    let state: "initialized" | "stable" | "invalidated";

    if (this.#initialized === false) {
      this.#initialized = true;
      state = "initialized";
    } else if (this.#bumped > this.#lastChecked) {
      state = "invalidated";
    } else {
      state = "stable";
    }

    this.#lastChecked = this.#bumped;

    return [current, state];
  }

  get bumped(): number {
    return this.#bumped;
  }

  get current(): T {
    return this.#formula.current;
  }
}
