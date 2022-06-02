import type { Description } from "@starbeam/debug";
import { Stack } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";
import type { FinalizedFrame, ReactiveInternals } from "@starbeam/timeline";
import { REACTIVE, TIMELINE } from "@starbeam/timeline";

import type { Reactive } from "../../reactive.js";
import { CompositeInternals } from "../../storage/composite.js";
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
    return new ReactiveFormula(
      Marker(description),
      UNINITIALIZED,
      formula,
      description
    );
  }

  #marker: Marker;
  #last: LastEvaluation<T> | UNINITIALIZED;
  readonly #formula: () => T;
  readonly #description: Description;

  private constructor(
    marker: Marker,
    last: LastEvaluation<T> | UNINITIALIZED,
    formula: () => T,
    description: Description
  ) {
    this.#marker = marker;
    this.#last = last;
    this.#formula = formula;
    this.#description = description;
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

  get current(): T {
    if (this.#last === UNINITIALIZED) {
      this.#marker.update();
      this.#marker.freeze();
    } else {
      const validation = this.#last.frame.validate();
      if (validation.status === "valid") {
        TIMELINE.didConsume(this.#last.frame);
        return validation.value;
      }
    }

    return this.#evaluate();
  }

  #evaluate(): T {
    const { value, frame } = TIMELINE.evaluateFormula(
      this.#formula,
      this.#description
    );
    TIMELINE.didConsume(frame);
    this.#last = { value, frame };

    return value;
  }
}

export function Formula<T>(
  formula: () => T,
  description?: string | Description
): ReactiveFormula<T> {
  return ReactiveFormula.create(
    formula,
    Stack.description("Formula", description)
  );
}

export type Formula<T> = ReactiveFormula<T>;
