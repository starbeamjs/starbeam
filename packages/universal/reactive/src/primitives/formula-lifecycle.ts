import { Desc } from "@starbeam/debug";
import type {
  ActiveFrame,
  Description,
  Expand,
  Tagged,
  Timestamp,
} from "@starbeam/interfaces";
import type { Tag } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { FormulaTag, NOW } from "@starbeam/tags";

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
    return new FinalizedFormulaImpl(this.#active(), NOW.now, this.#description);
  }
}

export const FormulaLifecycle = InitializingFormulaImpl.start;
export type InitializingFormula = Expand<InitializingFormulaImpl>;
export type FinalizedFormula = Expand<FinalizedFormulaImpl>;

class FinalizedFormulaImpl implements Tagged<FormulaTag> {
  static create = (
    children: Set<Tag>,
    description: Description
  ): FinalizedFormula => {
    return new FinalizedFormulaImpl(children, NOW.now, description);
  };

  #children: Set<Tag>;
  #lastValidated: Timestamp;
  declare readonly [TAG]: FormulaTag;

  constructor(
    children: Set<Tag>,
    lastValidated: Timestamp,
    description: Description
  ) {
    this.#children = children;
    this.#lastValidated = lastValidated;
    this[TAG] = FormulaTag.create(description, () => this.#children);
  }

  isStale(): boolean {
    return this[TAG].lastUpdated.gt(this.#lastValidated);
  }

  update(): { done: () => void } {
    const done = getRuntime().autotracking.start();

    return {
      done: () => {
        this.#children = done();
        this.#lastValidated = NOW.now;
        getRuntime().subscriptions.update(this[TAG]);
      },
    };
  }
}
