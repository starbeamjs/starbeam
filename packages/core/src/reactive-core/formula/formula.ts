import { DescriptionArgs, Stack } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";
import type { FinalizedFrame, ReactiveInternals } from "@starbeam/timeline";
import { REACTIVE, TIMELINE } from "@starbeam/timeline";

import { Reactive } from "../../reactive.js";
import { CompositeInternals } from "../../storage/composite.js";
import { ReactiveFn } from "../fn.js";
import { Marker } from "../marker.js";

interface LastEvaluation<T> {
  readonly frame: FinalizedFrame<T>;
  readonly value: T;
}

const INSPECT = Symbol.for("nodejs.util.inspect.custom");

export class ReactiveFormula<T> implements Reactive<T> {
  static create<T>(
    formula: () => T,
    description: DescriptionArgs
  ): ReactiveFormula<T> {
    return new ReactiveFormula(UNINITIALIZED, formula, description);
  }

  #marker: Marker;
  #last: LastEvaluation<T> | UNINITIALIZED;
  #formula: () => T;
  readonly #description: DescriptionArgs;

  private constructor(
    last: LastEvaluation<T> | UNINITIALIZED,
    formula: () => T,
    description: DescriptionArgs
  ) {
    this.#last = last;
    this.#formula = formula;
    this.#description = description;
    this.#marker = Marker(DescriptionArgs.key(description, "marker"));
  }

  get [REACTIVE](): ReactiveInternals {
    if (this.#last === UNINITIALIZED) {
      return this.#marker[REACTIVE];
    } else {
      return CompositeInternals(
        [this.#marker, this.#last.frame],
        this.#description
      );
    }
  }

  update(formula: () => T) {
    this.#formula = formula;

    // remove the last computation, which is no longer valid
    this.#last = UNINITIALIZED;
  }

  get current(): T {
    if (this.#last === UNINITIALIZED) {
      // this.#marker.update();
    } else {
      const validation = this.#last.frame.validate();
      if (validation.status === "valid") {
        TIMELINE.didConsume(this.#last.frame);
        return validation.value;
      }
    }

    return this.#evaluate();
  }

  [INSPECT]() {
    return `Formula(${Reactive.description(this).describe()})`;
  }

  #evaluate(): T {
    const { value, frame } = TIMELINE.evaluateFormula(
      this.#formula,
      this.#description
    );
    TIMELINE.didConsume(frame);
    this.#last = { value, frame };

    // Update any renderables that depend on this formula.
    TIMELINE.update(this);

    return value;
  }
}

type FormulaFn<T> = ReactiveFn<T> & { update: (formula: () => T) => void };

export function Formula<T>(
  formula: () => T,
  description?: string | DescriptionArgs
): FormulaFn<T> {
  const reactive = ReactiveFormula.create(
    formula,
    Stack.description(description)
  );

  const fn = ReactiveFn(reactive) as FormulaFn<T>;
  fn.update = (formula) => reactive.update(formula);

  (fn as Record<PropertyKey, any>)[Symbol.for("nodejs.util.inspect.custom")] =
    () => {
      return reactive[INSPECT]();
    };

  return fn;
}

export type Formula<T> = ReactiveFn<T>;
