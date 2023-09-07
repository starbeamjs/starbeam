import type { TagSnapshot } from "@starbeam/interfaces";
import { lastUpdated, NOW } from "@starbeam/tags";

import { getRuntime } from "../runtime.js";

export function StartTrackingFrame(): InitializingTrackingFrame {
  const done = getRuntime().start();

  return {
    done: () => FinalizedFormula(done()),
  };
}

export interface FinalizedFormula {
  readonly isStale: () => boolean;
  readonly children: () => TagSnapshot;
  readonly update: () => InitializingTrackingFrame;
}

export interface InitializingTrackingFrame {
  readonly done: () => FinalizedFormula;
}

export function FinalizedFormula(children: TagSnapshot): FinalizedFormula {
  let lastValidated = NOW.now;

  const isStale = () => lastUpdated(...children).at > lastValidated.at;

  function update() {
    const done = getRuntime().start();

    return {
      done: () => {
        children = done();
        lastValidated = NOW.now;
        return formula;
      },
    } satisfies InitializingTrackingFrame;
  }

  const formula = {
    isStale,
    children: () => children,
    update,
  } satisfies FinalizedFormula;

  return formula;
}
