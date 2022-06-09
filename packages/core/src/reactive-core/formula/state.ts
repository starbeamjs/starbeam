import type { DescriptionArgs } from "@starbeam/debug";
import {
  type FinalizedFrame,
  type ReactiveInternals,
  type ReactiveProtocol,
  REACTIVE,
} from "@starbeam/timeline";
import { type MutableInternals, TIMELINE } from "@starbeam/timeline";

/**
 * {@link FormulaState} represents the an instance of a formula and an
 * associated {@link FinalizedFrame}.
 */
export class FormulaState<T> implements ReactiveProtocol {
  static evaluate<T>(
    formula: () => T,
    description: DescriptionArgs
  ): { state: FormulaState<T>; value: T } {
    const { frame, value } = TIMELINE.evaluateFormula(formula, description);

    return {
      state: new FormulaState(formula, frame, value),
      value,
    };
  }

  readonly #formula: () => T;
  #frame: FinalizedFrame<T>;
  #lastValue: T;

  private constructor(
    formula: () => T,
    frame: FinalizedFrame<T>,
    lastValue: T
  ) {
    this.#formula = formula;
    this.#frame = frame;
    this.#lastValue = lastValue;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#frame[REACTIVE];
  }

  get frame(): FinalizedFrame<T> {
    return this.#frame;
  }

  get dependencies(): readonly MutableInternals[] {
    return this.#frame.dependencies;
  }

  validate():
    | { state: "valid"; value: T }
    | {
        state: "invalid";
        oldValue: T;
        compute: () =>
          | { state: "unchanged"; value: T }
          | { state: "changed"; value: T };
      } {
    const validation = this.#frame.validate();

    if (validation.status === "valid") {
      // TODO: Consume the reactive
      return { state: "valid", value: validation.value };
    }

    return {
      state: "invalid",
      oldValue: this.#lastValue,
      compute: () => {
        const { frame, value } = TIMELINE.evaluateFormula(
          this.#formula,
          this.#frame.description
        );

        const changed = this.#lastValue !== value;
        this.#lastValue = value;
        this.#frame = frame;

        return { state: changed ? "changed" : "unchanged", value };
      },
    };
  }

  poll():
    | { state: "unchanged"; value: T }
    | { state: "changed"; oldValue: T; value: T } {
    const validation = this.#frame.validate();

    if (validation.status === "valid") {
      // TODO: Consume the reactive
      return { state: "unchanged", value: validation.value };
    }

    const oldValue = this.#lastValue;

    const { frame, value } = TIMELINE.evaluateFormula(
      this.#formula,
      this.#frame.description
    );

    this.#lastValue = value;
    this.#frame = frame;

    return { state: "changed", value, oldValue };
  }
}
