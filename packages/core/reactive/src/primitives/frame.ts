import type {
  FormulaTag,
  NotifyReady,
  Unsubscribe,
} from "@starbeam/interfaces";
import { initializeFormulaTag } from "@starbeam/tags";
import { isPresent, verified } from "@starbeam/verify";

import { DEBUG, getRuntime } from "../runtime.js";
import { FinalizedFormula } from "./formula-lifecycle.js";

const FRAME_STACK: ActiveTrackingFrame[] = [];

export function startFrame(): ActiveTrackingFrame {
  const frame = new InitializingTrackingFrame();
  FRAME_STACK.push(frame);
  return frame;
}

function updateFrame(tag: FormulaTag): ActiveTrackingFrame {
  const frame = new UpdatingTrackingFrame(tag);
  FRAME_STACK.push(frame);
  return frame;
}

export function finishFrame(): TrackingFrame {
  return verified(FRAME_STACK.pop(), isPresent).done();
}

export interface ActiveTrackingFrame {
  readonly done: () => TrackingFrame;
}

export class UpdatingTrackingFrame implements ActiveTrackingFrame {
  readonly #tag: FormulaTag;

  constructor(tag: FormulaTag) {
    this.#tag = tag;
  }

  done(): TrackingFrame {
    getRuntime().update(this.#tag);
    return new TrackingFrame(this.#tag);
  }
}

export class InitializingTrackingFrame implements ActiveTrackingFrame {
  readonly #frame = getRuntime().start();

  done(): TrackingFrame {
    const initialized = FinalizedFormula(this.#frame());

    const tag = initializeFormulaTag(DEBUG?.Desc("formula", "rendered"), () =>
      initialized.children(),
    );

    return new TrackingFrame(tag);
  }
}

export class TrackingFrame {
  static update(frame: TrackingFrame): TrackingFrame {
    frame.#runtime.update(frame.#tag);
    return frame;
  }

  readonly #tag: FormulaTag;
  readonly #runtime = getRuntime();

  constructor(tag: FormulaTag) {
    this.#tag = tag;
  }

  update(): void {
    updateFrame(this.#tag);
  }

  subscribe(onChange: NotifyReady): Unsubscribe {
    return this.#runtime.subscribe(this.#tag, onChange);
  }
}
