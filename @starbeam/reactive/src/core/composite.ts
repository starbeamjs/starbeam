import {
  CompositeChild,
  REACTIVE,
  ReactiveInternals,
  type InitializedCompositeInternals,
  type MutableInternals,
  type ReactiveProtocol,
  type UninitializedCompositeInternals,
} from "@starbeam/timeline";
import { Abstraction } from "@starbeam/trace-internals";
import { UninitializedCompositeInternalsImpl } from "../internals/composite.js";

export class CompositeReactive implements ReactiveProtocol {
  static create(
    internals: UninitializedCompositeInternals | InitializedCompositeInternals
  ): CompositeReactive {
    return new CompositeReactive(internals);
  }

  #internals: UninitializedCompositeInternals | InitializedCompositeInternals;

  private constructor(
    internals: UninitializedCompositeInternals | InitializedCompositeInternals
  ) {
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
  dependencies: Iterable<MutableInternals>,
  description: string
) => {
  return Composite(description).set([...dependencies]);
};

Composite.fromReactives = (
  reactives: Iterable<ReactiveProtocol>,
  description = Abstraction.callerFrame()
) => {
  return Composite(description).set([...reactives].map(ReactiveInternals.get));
};

export type Composite = CompositeReactive;
