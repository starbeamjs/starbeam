import type { CoreTag } from "@starbeam/interfaces";
import { lastUpdated, NOW } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";

export function FormulaLifecycle(): InitializingFormula {
  const done = RUNTIME.autotracking.start();

  return {
    done: () => FinalizedFormula(done()),
  };
}

function FinalizedFormula(children: Set<CoreTag>): FinalizedFormula {
  let lastValidated = NOW.now;

  const isStale = () => lastUpdated(...children).gt(lastValidated);

  function update() {
    const done = RUNTIME.autotracking.start();

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
  readonly children: () => Set<CoreTag>;
  readonly update: () => InitializingFormula;
}
