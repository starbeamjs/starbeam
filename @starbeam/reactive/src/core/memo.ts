import {
  FinalizedFrame,
  REACTIVE,
  ReactiveInternals,
  TIMELINE,
} from "@starbeam/timeline";
import { Abstraction } from "@starbeam/trace-internals";
import { CompositeInternals } from "../internals/composite.js";
import { Reactive, type ReactiveValue } from "../reactive.js";
import { Initializable } from "./initializable.js";

export interface PolledMemo<T> {
  readonly value: T;
  readonly frame: FinalizedFrame<T>;
}

export class ReactiveMemo<T> implements ReactiveValue<T> {
  static create<T>(callback: () => T, description: string): ReactiveMemo<T> {
    return new ReactiveMemo(callback, Initializable.create(description));
  }

  readonly #formula: () => T;
  #frame: Initializable<FinalizedFrame<T>>;

  private constructor(
    callback: () => T,
    frame: Initializable<FinalizedFrame<T>>
  ) {
    this.#formula = callback;
    this.#frame = frame;
  }

  toString() {
    return this.#frame.match({
      Initialized: ({ value }) => {
        const valid = value.validate();
        const desc =
          valid.status === "valid" ? `fresh ${valid.value}` : `stale`;
        return `Memo(${desc})`;
      },
      Uninitialized: (marker) =>
        `Memo({uninitialized ${Reactive.description(marker)}})`,
    });
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#frame.match({
      Uninitialized: (marker): ReactiveInternals => marker[REACTIVE],
      Initialized: ({ value }) =>
        CompositeInternals(value.children, this.#frame.description),
    });
  }

  get current(): T {
    const { initialized, value } = this.#frame.upsert({
      create: (description) => {
        const { frame, value } = TIMELINE.evaluateFormula(
          this.#formula,
          description
        );
        return { initialized: frame, value };
      },
      update: (frame, description) => {
        const validation = frame.validate();

        switch (validation.status) {
          case "valid": {
            return {
              updated: frame,
              value: validation.value,
            };
          }
          case "invalid": {
            const { frame, value } = TIMELINE.evaluateFormula(
              this.#formula,
              description
            );

            return { updated: frame, value };
          }
        }
      },
    });

    this.#frame = initialized;

    return value;
  }
}

export function Memo<T>(
  callback: () => T,
  description = Abstraction.callerFrame()
): ReactiveMemo<T> {
  return ReactiveMemo.create(callback, description);
}

export type Memo<T> = ReactiveMemo<T>;
