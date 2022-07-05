import { type DescriptionArgs, Stack, Description } from "@starbeam/debug";
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
    description: Description
  ): ReactiveFormula<T> {
    return new ReactiveFormula(UNINITIALIZED, formula, description);
  }

  #marker: Marker;
  #last: LastEvaluation<T> | UNINITIALIZED;
  #formula: () => T;
  readonly #description: Description;

  private constructor(
    last: LastEvaluation<T> | UNINITIALIZED,
    formula: () => T,
    description: Description
  ) {
    this.#last = last;
    this.#formula = formula;
    this.#description = description;
    this.#marker = Marker(description.key("marker"));
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
    return this.read(Stack.fromCaller());
  }

  read(caller: Stack): T {
    if (this.#last === UNINITIALIZED) {
      // do nothing
    } else {
      const validation = this.#last.frame.validate();
      if (validation.status === "valid") {
        TIMELINE.didConsume(this.#last.frame, caller);
        return validation.value;
      }
    }

    return this.#evaluate(caller);
  }

  [INSPECT]() {
    return `Formula(${Reactive.description(this).describe()})`;
  }

  #evaluate(caller: Stack): T {
    const { value, frame } = TIMELINE.evaluateFormula(
      this.#formula,
      this.#description,
      caller
    );
    TIMELINE.didConsume(frame, caller);
    this.#last = { value, frame };

    // Update any renderables that depend on this formula.
    TIMELINE.update(this);

    return value;
  }
}

type FormulaFn<T> = ReactiveFn<T> & { update: (formula: () => T) => void };

export function Formula<T>(
  formula: () => T,
  description?: string | Description
): FormulaFn<T> {
  const reactive = ReactiveFormula.create(
    formula,
    Stack.description({
      type: "formula",
      api: {
        package: "@starbeam/core",
        name: "Formula",
      },
      fromUser: description,
    })
  );

  const fn = ReactiveFn(reactive) as FormulaFn<T>;
  fn.update = (formula) => reactive.update(formula);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fn as Record<PropertyKey, any>)[Symbol.for("nodejs.util.inspect.custom")] =
    () => {
      return reactive[INSPECT]();
    };

  return fn;
}

export type Formula<T> = ReactiveFn<T>;
