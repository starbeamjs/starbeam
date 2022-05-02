import { Stack } from "@starbeam/debug-utils";
import { TIMELINE, type FinalizedFrame } from "@starbeam/timeline";

/**
 * This class is meant to be used in a situation where you are unable to wrap an entire computation in a single function call.
 *
 * For example, Svelte provides beforeUpdate and afterUpdate lifecycle hooks. These reliably run (synchronously) around the code that consumes reactive values, but it is not possible to wrap the whole thing in a single block.
 *
 * The idea is that in the first render, you instantiate the ManualFormula in beforeUpdate and finalize it in afterUpdate.
 *
 * In the next render, you can poll the `ManualFormula` to start a new computation in `beforeUpdate` (if it has changed). You can then (unconditionally) finalize the computation in `afterUpdate`.
 */
export class FinishedManualFormula {
  static create(
    frame: FinalizedFrame<void>,
    description: string
  ): FinishedManualFormula {
    return new FinishedManualFormula(frame, description);
  }

  #frame: FinalizedFrame<void>;
  #description: string;

  private constructor(frame: FinalizedFrame<void>, description: string) {
    this.#frame = frame;
    this.#description = description;
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
  description = Stack.describeCaller()
): StartedManualFormula {
  const formula = TIMELINE.startFormula(description);

  return {
    done: () => FinishedManualFormula.create(formula.done().frame, description),
    catch: (e: unknown) => {
      formula.finally();
      throw e;
    },
  };
}
