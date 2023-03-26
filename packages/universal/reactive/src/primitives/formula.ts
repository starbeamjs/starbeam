import { readonly } from "@starbeam/core-utils";
import { Desc, type Description } from "@starbeam/debug";
import type { ReactiveFormula, Stack, Tag as ITag } from "@starbeam/interfaces";
import { TAG, UNINITIALIZED } from "@starbeam/shared";
import { Tag, type Timestamp, zero } from "@starbeam/tags";
import { FormulaTag, NOW } from "@starbeam/tags";

import { getRuntime } from "../runtime.js";
import type { PrimitiveOptions } from "./shared.js";

class FormulaImpl<T> implements ReactiveFormula<T> {
  static create = <T>(
    compute: () => T,
    { description }: PrimitiveOptions
  ): FormulaImpl<T> => {
    return new FormulaImpl(compute, Desc("formula", description));
  };

  declare readonly [TAG]: ITag;
  readonly #memo: Memo<T>;
  #children = new Set<ITag>();
  #lastValidated: Timestamp = zero();

  private constructor(compute: () => T, description: Description) {
    this.#memo = new Memo(compute);
    readonly(
      this,
      TAG,
      FormulaTag.create(description, () => this.#children)
    );
  }

  get current(): T {
    return this.read(getRuntime().callerStack());
  }

  read(_stack?: Stack | undefined): T {
    getRuntime().autotracking.consume(this[TAG]);

    const last = this.#memo.last;

    if (last === UNINITIALIZED || this.#isStale()) {
      return this.#evaluate();
    } else {
      return last;
    }
  }

  #evaluate(): T {
    const done = getRuntime().autotracking.start();
    const value = this.#memo.compute();
    this.#children = done();
    this.#lastValidated = NOW.now;
    getRuntime().subscriptions.update(this);
    return value;
  }

  #isStale(): boolean {
    return Tag.lastUpdatedIn(this.#children).gt(this.#lastValidated);
  }
}

class Memo<T> {
  #value: T | UNINITIALIZED = UNINITIALIZED;
  readonly #compute: () => T;

  constructor(compute: () => T) {
    this.#compute = compute;
  }

  compute(): T {
    this.#value = this.#compute();
    return this.#value;
  }

  get last(): T | UNINITIALIZED {
    return this.#value;
  }
}

export const Formula = FormulaImpl.create;
export type Formula<T> = FormulaImpl<T>;
