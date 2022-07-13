import { type Description, descriptionFrom } from "@starbeam/debug";
import {
  type ReactiveInternals,
  type ReactiveProtocol,
  REACTIVE,
  TIMELINE,
} from "@starbeam/timeline";

import { Formula } from "./formula/formula.js";
import { PolledFormula } from "./formula/polled-formula.js";

/**
 * A {@linkcode Renderable} represents a reactive output whose render timing is controlled by a
 * renderer.
 *
 * Because it implements {@linkcode ReactiveProtocol}, it can notify a renderer when it changes, and
 * the renderer can call {@linkcode Renderable#poll} to refresh the output at an appropriate timing.
 *
 * For example, the React renderer notifies React whenever the renderable has changed, and the
 * normal React render cycle is then responsible for polling the renderable.
 *
 */
export class ReactiveRenderable implements ReactiveProtocol {
  /**
   * A cached renderer depends only on Starbeam state, and therefore can cache its result, assuming
   * that any changes to dependencies are tracked by Starbeam.
   */
  static cached(
    fn: () => void,
    description?: string | Description
  ): Renderable {
    const desc = descriptionFrom({
      type: "renderer",
      api: {
        package: "@stareabem/core",
        name: "Renderable",
        method: {
          name: "cached",
          type: "static",
        },
      },
      fromUser: description,
    });

    const formula = Formula(fn, desc);
    return new Renderable(formula);
  }

  /**
   * A mixed renderable depends on both Starbeam state and external reactive state (such as stable
   * react variables). As a result, it uses a {@linkcode PolledFormula} under the hood, which
   * **notifies** the renderer when any reactive state has changed, but doesn't attempt to cache the
   * result of the formula function.
   */
  static mixed(fn: () => void, description?: Description | string): Renderable {
    const desc = descriptionFrom({
      type: "renderer",
      api: {
        package: "@stareabem/core",
        name: "Renderable",
        method: {
          name: "mixed",
          type: "static",
        },
      },
      fromUser: description,
    });

    const formula = PolledFormula(fn, desc);
    return new Renderable(formula);
  }

  readonly #formula: Formula<void> | PolledFormula<void>;

  constructor(formula: Formula<void> | PolledFormula<void>) {
    this.#formula = formula;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#formula[REACTIVE];
  }

  readonly poll = (): void => {
    this.#formula.current;
    TIMELINE.update(this);
  };
}

export const Renderable = ReactiveRenderable;
export type Renderable = ReactiveRenderable;
