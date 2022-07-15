import { type Description, descriptionFrom } from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";
import {
  type FinalizedFrame,
  type ReactiveInternals,
  type ReactiveProtocol,
  TIMELINE,
} from "@starbeam/timeline";

/**
 * This class is meant to be used in a situation where you are unable to wrap an entire computation in a single function call.
 *
 * For example, Svelte provides beforeUpdate and afterUpdate lifecycle hooks. These reliably run (synchronously) around the code that consumes reactive values, but it is not possible to wrap the whole thing in a single block.
 *
 * The idea is that in the first render, you instantiate the ManualFormula in beforeUpdate and finalize it in afterUpdate.
 *
 * In the next render, you can poll the `ManualFormula` to start a new computation in `beforeUpdate` (if it has changed). You can then (unconditionally) finalize the computation in `afterUpdate`.
 */
export class FinishedManualFormula implements ReactiveProtocol {
  static create(
    frame: FinalizedFrame<void>,
    description: Description
  ): FinishedManualFormula {
    return new FinishedManualFormula(frame, description);
  }

  #frame: FinalizedFrame<void>;
  #description: Description;

  private constructor(frame: FinalizedFrame<void>, description: Description) {
    this.#frame = frame;
    this.#description = description;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#frame[REACTIVE];
  }

  #poll(): ManualFormula {
    const state = this.#frame.validate();

    switch (state.status) {
      case "valid":
        return {
          done: () => null,
          catch: (e: unknown) => {
            throw e;
          },
        };
      case "invalid": {
        const formula = TIMELINE.startFormula(this.#description);

        return {
          done: () => {
            this.#frame = formula.done().frame;
          },
          catch: (e: unknown) => {
            formula.finally();
            throw e;
          },
        };
      }
    }
  }

  readonly poll = {
    start: () => this.#poll(),
  };
}

export interface ManualFormula {
  done: () => void;
  catch: (e: unknown) => never;
}

export interface StartedManualFormula {
  done: () => FinishedManualFormula;
  catch: (e: unknown) => never;
}

export function ManualFormula(
  description?: string | Description
): StartedManualFormula {
  const normalizedDescription = descriptionFrom({
    type: "formula",
    api: {
      package: "@starbeam/core",
      name: "ManualFormula",
    },
    fromUser: description,
  });

  const formula = TIMELINE.startFormula(normalizedDescription);

  return {
    done: () =>
      FinishedManualFormula.create(formula.done().frame, normalizedDescription),
    catch: (e: unknown) => {
      formula.finally();
      throw e;
    },
  };
}
