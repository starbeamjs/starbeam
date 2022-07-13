import type { Stack } from "@starbeam/debug";
import {
  type Description,
  callerStack,
  descriptionFrom,
} from "@starbeam/debug";
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

/**
 * A {@linkcode PolledFormula} is like a {@linkcode Formula}, but it never attempts to avoid running the
 * formula function when the formula is still valid.
 *
 * Its purpose is to provide notifications if any reactive dependency is invalidated, but not get in
 * the way of other kinds of polling-style reactive notifications coming from a framework.
 *
 * In other words, it is a way to create a reactive formula in an environment that will be
 * invalidated by framework polling (and a framework-specific dependency tracking mechanism), but
 * wants to mix in Starbeam's notification mechanism for Starbeam dependencies.
 */
export class ReactivePolledFormula<T> implements Reactive<T> {
  static create<T>(
    formula: () => T,
    description: Description
  ): PolledFormula<T> {
    return new ReactivePolledFormula(
      UNINITIALIZED,
      false,
      formula,
      description
    );
  }

  static memo<T>(
    formula: () => T,
    description: Description
  ): ReactivePolledFormula<T> {
    return new ReactivePolledFormula(UNINITIALIZED, true, formula, description);
  }

  #marker: Marker;
  #shouldMemo: boolean;
  #last: LastEvaluation<T> | UNINITIALIZED;
  #formula: () => T;
  readonly #description: Description;

  private constructor(
    last: LastEvaluation<T> | UNINITIALIZED,
    shouldMemo: boolean,
    formula: () => T,
    description: Description
  ) {
    this.#last = last;
    this.#shouldMemo = shouldMemo;
    this.#formula = formula;
    this.#description = description;
    this.#marker = Marker(description);
  }

  get [REACTIVE](): ReactiveInternals {
    if (this.#last === UNINITIALIZED) {
      return this.#marker[REACTIVE];
    } else {
      return CompositeInternals([this.#last.frame], this.#description);
    }
  }

  get current(): T {
    return this.#evaluate(callerStack());
  }

  read(caller: Stack): T {
    return this.#evaluate(caller);
  }

  update(formula: () => T): void {
    this.#formula = formula;
    this.#last = UNINITIALIZED;
    this.#marker.update();

    TIMELINE.update(this);
  }

  #evaluate(caller: Stack): T {
    if (this.#shouldMemo && this.#last !== UNINITIALIZED) {
      const validation = this.#last.frame.validate();
      if (validation.status === "valid") {
        TIMELINE.didConsume(this.#last.frame, caller);
        return validation.value;
      }
    }

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

/**
 * A {@linkcode PolledFormula} is a reactive value that recomputes its value whenever it's polled.
 *
 * Because it's a reactive value, you can {@linkcode TIMELINE.render} it in order to get notified
 * when its Starbeam dependencies are invalidated.
 *
 * This is useful in a mixed environment that also includes a separate framework notion of explicit
 * or auto-tracked dependencies.
 *
 * The intended usage pattern is:
 *
 * - The body of a `PolledFormula` can access reactive values from a framework as long as the framework
 *   is aware of them.
 * - The body of a `PolledFormula` can also freely access Starbeam reactive values.
 * - When the framework's dependencies change, the framework will run the function that used the
 *   formula, which will unconditionally run the body of the formula, which will therefore see the
 *   up-to-date versions of any framework reactive variables.
 * - The user of the `PolledFormula` should `render` it, and notify the framework if a change
 *   occurs. This will *also* cause the framework to run the function that used the formula.
 */
export function PolledFormula<T>(
  formula: () => T,
  description?: string | Description
): PolledFormula<T> {
  return ReactivePolledFormula.create(
    formula,
    descriptionFrom({
      type: "formula",
      api: {
        package: "@starbeam/core",
        name: "PolledFormula",
      },
      fromUser: description,
    })
  );
}

export type PolledFormula<T> = ReactivePolledFormula<T>;
