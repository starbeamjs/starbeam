import type { FormulaFn } from "@starbeam/universal";
import { CachedFormula } from "@starbeam/universal";

const INITIAL = 0;

export class Invalidation<T> {
  static trace<T>(formula: () => T): Invalidation<T> {
    return new Invalidation(formula);
  }

  #bumped = INITIAL;
  readonly #formula: FormulaFn<T>;
  #lastChecked = INITIAL;
  #initialized = false;

  constructor(formula: () => T) {
    this.#formula = CachedFormula(() => {
      this.#bumped++;
      return formula();
    });
  }

  get state(): [value: T, state: "initialized" | "stable" | "invalidated"] {
    const current = this.current;

    let state: "initialized" | "stable" | "invalidated";

    if (this.#initialized) {
      if (this.#lastChecked === this.#bumped) {
        state = "stable";
      } else {
        state = "invalidated";
      }
    } else {
      this.#initialized = true;
      state = "initialized";
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
