import type {
  Description,
  Expand,
  ReactiveFormula,
  TagSet,
} from "@starbeam/interfaces";
import type { FormulaTag } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createFormulaTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import { ReactivePrimitive } from "./base.js";
import {
  type FormulaFn,
  type SugaryPrimitiveOptions,
  toOptions,
  WrapFn,
} from "./utils.js";

export class FormulaImpl<T>
  extends ReactivePrimitive<T, FormulaTag>
  implements ReactiveFormula<T>
{
  static create = <T>(compute: () => T, options?: SugaryPrimitiveOptions) => {
    const { description } = toOptions(options);
    const formula = new FormulaImpl(
      compute,
      RUNTIME.Desc?.("formula", description)
    );

    return WrapFn(formula);
  };

  #compute: () => T;
  #children: TagSet = new Set();

  private constructor(compute: () => T, description: Description | undefined) {
    super(createFormulaTag(description, () => this.#children));
    this.#compute = compute;
  }

  read(_caller = RUNTIME.callerStack?.()): T {
    const { value, tags } = RUNTIME.evaluate(this.#compute);
    this.#children = tags;

    this[TAG].markInitialized();
    RUNTIME.subscriptions.update(this[TAG]);

    return value;
  }
}

export const Formula = FormulaImpl.create;
export type Formula<T> = Expand<FormulaFn<T>> & (() => T);
