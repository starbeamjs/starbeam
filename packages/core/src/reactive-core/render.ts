import type { Description } from "@starbeam/debug";
import { Stack } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";
import type { FinalizedFrame, ReactiveInternals } from "@starbeam/timeline";
import { REACTIVE, TIMELINE } from "@starbeam/timeline";

import type { Reactive } from "../reactive.js";
import { CompositeInternals } from "../storage/composite.js";
import { ReactiveFn } from "./fn.js";
import { Marker } from "./marker.js";

interface LastEvaluation<T> {
  readonly frame: FinalizedFrame<T>;
  readonly value: T;
}

/**
 * A {@linkcode RenderedValueImpl} value takes a function to evaluate.
 *
 * Unlike a {@linkcode Formula}, it never caches the intermediate result. Instead, it serves as an
 * input to `Timeline.render`, which will notify the framework when the `Rendered` invalidates, but
 * still allow the framework's own reactive concepts to drive the rendering.
 *
 * This means that even if the `Rendered` doesn't invalidate, if the framework attempts to compute
 * the value of the `Rendered`, it will be re-evaluated.
 */
export class RenderedValueImpl<T> implements Reactive<T> {
  static create<T>(
    evaluate: () => T,
    description: Description
  ): RenderedValueImpl<T> {
    return new RenderedValueImpl(UNINITIALIZED, evaluate, description);
  }

  #marker: Marker;
  #last: LastEvaluation<T> | UNINITIALIZED;
  readonly #function: () => T;
  readonly #description: Description;

  private constructor(
    last: LastEvaluation<T> | UNINITIALIZED,
    formula: () => T,
    description: Description
  ) {
    this.#last = last;
    this.#function = formula;
    this.#description = description;
    this.#marker = Marker(description);
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
    return this.read(Stack.fromCaller());
  }

  read(caller: Stack): T {
    const { value, frame } = TIMELINE.evaluateFormula(
      this.#function,
      this.#description,
      caller
    );
    TIMELINE.didConsume(frame, caller);
    this.#last = { value, frame };

    return value;
  }
}

export function RenderedValue<T>(
  formula: () => T,
  description?: string | Description
): ReactiveFn<T> {
  const reactive = RenderedValueImpl.create(
    formula,
    Stack.description({
      type: "renderer",
      api: {
        package: "@starbeam/core",
        name: "RenderedValue",
      },
      fromUser: description,
    })
  );

  return ReactiveFn(reactive);
}

export type RenderedValue<T> = ReactiveFn<T>;
