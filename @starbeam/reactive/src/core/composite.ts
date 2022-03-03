import { Abstraction } from "@starbeam/debug";
import {
  CompositeChild,
  REACTIVE,
  ReactiveInternals,
  type CompositeInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";
import { UninitializedCompositeInternalsImpl } from "../internals/composite.js";

export class CompositeReactive implements ReactiveProtocol {
  static create(internals: CompositeInternals): CompositeReactive {
    return new CompositeReactive(internals);
  }

  #internals: CompositeInternals;

  private constructor(internals: CompositeInternals) {
    this.#internals = internals;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#internals;
  }

  set(dependencies: readonly ReactiveInternals[]): this {
    if (this.#internals.state === "uninitialized") {
      this.#internals = this.#internals.initialize(
        CompositeChild.Interior(dependencies)
      );
    } else {
      this.#internals.update(CompositeChild.Interior(dependencies));
    }

    return this;
  }
}

export function Composite(
  description = Abstraction.callerFrame()
): CompositeReactive {
  return CompositeReactive.create(
    UninitializedCompositeInternalsImpl.create(description)
  );
}

Composite.from = (
  reactives: Iterable<ReactiveProtocol>,
  description = Abstraction.callerFrame()
) => {
  return Composite(description).set([...reactives].map(ReactiveInternals.get));
};

export type Composite = CompositeReactive;
