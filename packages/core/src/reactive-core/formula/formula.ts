import {
  type Description,
  type Inspect,
  type Stack,
  callerStack,
  descriptionFrom,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports
  ifDebug,
  INSPECT,
  inspect,
  isDebug,
} from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";
import type { FinalizedFrame, ReactiveInternals } from "@starbeam/timeline";
import { REACTIVE, TIMELINE } from "@starbeam/timeline";
import type { CustomInspectFunction } from "util";

import { Reactive } from "../../reactive.js";
import { CompositeInternals } from "../../storage/composite.js";
import { ReactiveFn } from "../fn.js";
import { Marker } from "../marker.js";

interface LastEvaluation<T> {
  readonly frame: FinalizedFrame<T>;
  readonly value: T;
}

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

  update(formula: () => T): void {
    this.#formula = formula;

    // remove the last computation, which is no longer valid
    this.#last = UNINITIALIZED;
  }

  get current(): T {
    return this.read(callerStack());
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

  @ifDebug
  [Symbol.for("nodejs.util.inspect.custom")](): string {
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

export type FormulaFn<T> = ReactiveFn<T> & {
  update: (formula: () => T) => void;
};

export function Formula<T>(
  formula: () => T,
  description?: string | Description
): Formula<T> {
  const reactive = ReactiveFormula.create(
    formula,
    descriptionFrom({
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

  if (isDebug()) {
    (fn as Partial<Inspect>)[INSPECT] = (
      ...args: Parameters<CustomInspectFunction>
    ) => inspect(reactive, ...args);
  }

  return fn;
}

export type Formula<T> = FormulaFn<T>;
