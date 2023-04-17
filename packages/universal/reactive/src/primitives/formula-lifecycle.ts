import type { TagSnapshot } from "@starbeam/interfaces";
import { lastUpdated, NOW } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";

export function FormulaLifecycle(): InitializingFormula {
  const done = RUNTIME.start();

  return {
    done: () => FinalizedFormula(done()),
  };
}

function FinalizedFormula(children: TagSnapshot): FinalizedFormula {
  let lastValidated = NOW.now;

  const isStale = () => lastUpdated(...children).gt(lastValidated);

  function update() {
    const done = RUNTIME.start();

    return {
      done: () => {
        children = done();
        lastValidated = NOW.now;
        return formula;
      },
    };
  }

  const formula = {
    isStale,
    children: () => children,
    update,
  };

  return formula;
}

export interface InitializingFormula {
  readonly done: () => FinalizedFormula;
}

export interface FinalizedFormula {
  readonly isStale: () => boolean;
  readonly children: () => TagSnapshot;
  readonly update: () => InitializingFormula;
}
