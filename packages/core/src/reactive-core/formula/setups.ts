import type { Description, ReactiveProtocol } from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";
import {
  type ReactiveInternals,
  type Unsubscribe,
  LIFETIME,
} from "@starbeam/timeline";

import { CompositeInternals } from "../../storage/composite.js";
import { Formula } from "./formula.js";

type SetupFunction = () => void | (() => void);

// TODO: I think that setups should ignore reads that are followed by writes.

class Setup implements ReactiveProtocol {
  static create(setupFn: SetupFunction, description: Description): Setup {
    let cleanup: (() => void) | void;

    const formula = Formula(() => {
      if (cleanup) {
        cleanup();
      }

      cleanup = setupFn();
    }, description);

    const setup = new Setup(formula);

    LIFETIME.on.cleanup(setup, () => {
      if (cleanup) cleanup();
    });

    return setup;
  }

  #formula: Formula<void>;

  constructor(formula: Formula<void>) {
    this.#formula = formula;
  }

  get [REACTIVE]() {
    return this.#formula[REACTIVE];
  }

  poll() {
    this.#formula();
  }
}

/**
 * {@linkcode ReactiveSetups} represents a collection of reactive setup functions that automatically
 * clean themselves up and reinitialize whenever any of their dependencies invalidates.
 *
 * The {@linkcode ReactiveSetups} itself is a {@linkcode ReactiveProtocol}, which means that other
 * can subscribe to it in order to poll it for updates, which will result in the setup functions
 * being reinitialized at a timing that is appropriate for the renderer using the
 * {@linkcode ReactiveSetups}.
 */
export class ReactiveSetups implements ReactiveProtocol {
  static create(this: void, description: Description): Setups {
    return new ReactiveSetups(new Set(), description);
  }

  #setups: Set<Setup>;
  #description: Description;

  constructor(setups: Set<Setup>, description: Description) {
    this.#setups = setups;
    this.#description = description;
  }

  get [REACTIVE](): ReactiveInternals {
    return CompositeInternals([...this.#setups.keys()], this.#description);
  }

  register(setupFn: SetupFunction): Unsubscribe {
    const setup = Setup.create(setupFn, this.#description.key("setup"));
    const unsubscribe = LIFETIME.link(this, setup);

    this.#setups.add(setup);

    return () => {
      unsubscribe();
      this.#setups.delete(setup);
    };
  }

  poll(): void {
    for (const setup of this.#setups) {
      setup.poll();
    }
  }
}

export const Setups = ReactiveSetups.create;
export type Setups = ReactiveSetups;
