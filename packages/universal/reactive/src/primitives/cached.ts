import type {
  Description,
  FormulaTag,
  ReactiveFormula,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createFormulaTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import type { Formula } from "./formula.js";
import {
  type FinalizedFormula,
  FormulaLifecycle,
} from "./formula-lifecycle.js";
import {
  type FormulaFn,
  type SugaryPrimitiveOptions,
  toOptions,
  WrapFn,
} from "./utils.js";

interface Last<T> {
  readonly formula: FinalizedFormula;
  value: T;
}

class FormulaImpl<T> implements ReactiveFormula<T> {
  static create = <T>(
    compute: () => T,
    options?: SugaryPrimitiveOptions
  ): FormulaFn<T> => {
    const { description } = toOptions(options);
    const formula = new FormulaImpl(
      compute,
      RUNTIME.debug?.desc("formula", description)
    );

    return WrapFn(formula);
  };

  declare readonly [TAG]: FormulaTag;
  readonly #compute: () => T;
  #last: Last<T> | null;

  private constructor(compute: () => T, description: Description | undefined) {
    this.#last = null;
    this.#compute = compute;
    this[TAG] = createFormulaTag(description, () => {
      if (this.#last === null) return new Set();
      return this.#last.formula.children();
    });
  }

  get current(): T {
    return this.read(RUNTIME.callerStack?.());
  }

  read(_caller = RUNTIME.callerStack?.()): T {
    const value = this.#evaluate();
    RUNTIME.autotracking.consume(this[TAG]);
    return value;
  }

  #evaluate(): T {
    if (this.#last === null) {
      return this.#initialize();
    } else if (this.#last.formula.isStale()) {
      return this.#update(this.#last);
    } else {
      return this.#last.value;
    }
  }

  #initialize(): T {
    const lifecycle = FormulaLifecycle(this[TAG].description);
    const value = this.#compute();
    const formula = lifecycle.done();

    this.#last = {
      formula,
      value,
    };

    this[TAG].markInitialized();
    RUNTIME.subscriptions.update(this[TAG]);

    return value;
  }

  #update(last: Last<T>): T {
    const lifecycle = last.formula.update();
    const value = this.#compute();
    lifecycle.done();
    RUNTIME.subscriptions.update(this[TAG]);

    last.value = value;
    return value;
  }
}

export const CachedFormula = FormulaImpl.create;
export type CachedFormula<T> = Formula<T>;
