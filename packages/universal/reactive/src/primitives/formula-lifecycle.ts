import type {
  ActiveFrame,
  Description,
  Expand,
  Tag,
  Timestamp,
} from "@starbeam/interfaces";
import { lastUpdated, NOW } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import { type SugaryPrimitiveOptions, toOptions } from "./utils.js";

export class InitializingFormulaImpl {
  static start = (options?: SugaryPrimitiveOptions): InitializingFormula => {
    const { description } = toOptions(options);
    const active = RUNTIME.autotracking.start();
    return new InitializingFormulaImpl(
      active,
      RUNTIME.Desc?.("formula", description)
    );
  };

  readonly #active: ActiveFrame;
  readonly #description: Description | undefined;

  private constructor(
    active: () => Set<Tag>,
    description: Description | undefined
  ) {
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
    return lastUpdated(...this.#children).gt(this.#lastValidated);
  }

  children(): Set<Tag> {
    return this.#children;
  }

  update(): InitializingFormula {
    const done = RUNTIME.autotracking.start();

    return {
      done: () => {
        this.#children = done();
        this.#lastValidated = NOW.now;
        return this;
      },
    };
  }
}
