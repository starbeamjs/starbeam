import { Desc } from "@starbeam/debug";
import type {
  ActiveFrame,
  Description,
  Expand,
  Timestamp,
} from "@starbeam/interfaces";
import type { Tag } from "@starbeam/interfaces";
import { NOW, TagUtils } from "@starbeam/tags";

import { getRuntime } from "../runtime.js";
import { type SugaryPrimitiveOptions, toOptions } from "./utils.js";

export class InitializingFormulaImpl {
  static start = (options?: SugaryPrimitiveOptions): InitializingFormula => {
    const { description } = toOptions(options);
    const active = getRuntime().autotracking.start();
    return new InitializingFormulaImpl(active, Desc("formula", description));
  };

  readonly #active: ActiveFrame;
  readonly #description: Description;

  private constructor(active: () => Set<Tag>, description: Description) {
    this.#active = active;
    this.#description = description;
  }

  done(): FinalizedFormula {
    return new FinalizedFormulaImpl(this.#active(), NOW.now);
  }
}

export const FormulaLifecycle = InitializingFormulaImpl.start;
export type InitializingFormula = Expand<InitializingFormulaImpl>;
export type FinalizedFormula = Expand<FinalizedFormulaImpl>;

class FinalizedFormulaImpl {
  static create = (children: Set<Tag>): FinalizedFormula => {
    return new FinalizedFormulaImpl(children, NOW.now);
  };

  #children: Set<Tag>;
  #lastValidated: Timestamp;

  constructor(children: Set<Tag>, lastValidated: Timestamp) {
    this.#children = children;
    this.#lastValidated = lastValidated;
  }

  isStale(): boolean {
    return TagUtils.lastUpdatedIn(this.#children).gt(this.#lastValidated);
  }

  children(): Set<Tag> {
    return this.#children;
  }

  update(): InitializingFormula {
    const done = getRuntime().autotracking.start();

    return {
      done: () => {
        this.#children = done();
        this.#lastValidated = NOW.now;
        return this;
      },
    };
  }
}
