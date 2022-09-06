import { type Description, descriptionFrom } from "@starbeam/debug";
import { getID } from "@starbeam/peer";
import { type Unsubscribe, LIFETIME } from "@starbeam/timeline";

import { Marker } from "../marker.js";
import { FormulaFn } from "./formula.js";

type SetupFunction = () => void | (() => void);
export type Setup = FormulaFn<void>;

// TODO: I think that setups should ignore reads that are followed by writes.

export function Setup(
  setupFn: SetupFunction,
  description?: string | Description
): Setup {
  const desc = descriptionFrom({
    type: "formula",
    id: getID(),
    api: {
      package: "@starbeam/core",
      name: "Setup",
    },
    fromUser: description,
  });

  let cleanup: (() => void) | void;

  const setup = FormulaFn(() => {
    if (cleanup) {
      cleanup();
    }

    cleanup = setupFn();
  }, desc);

  LIFETIME.on.cleanup(setup, () => {
    if (cleanup) {
      cleanup();
    }
  });

  return setup;
}

/**
 * {@linkcode Setups} represents a collection of reactive setup functions that automatically clean
 * themselves up and reinitialize whenever any of their dependencies invalidates.
 *
 * The {@linkcode Setups} itself is a {@linkcode ReactiveProtocol}, which means that other can
 * subscribe to it in order to poll it for updates, which will result in the setup functions being
 * reinitialized at a timing that is appropriate for the renderer using the {@linkcode Setups}.
 */

export interface Setups {
  register: (setupFn: SetupFunction, description: Description) => Unsubscribe;
  setups: FormulaFn<void>;
}

export function Setups(description: Description): Setups {
  const setups = new Set<Setup>();
  const marker = Marker(
    description.implementation(getID(), { reason: "setups changed" })
  );

  const register = (setupFn: SetupFunction, description: Description) => {
    const setup = Setup(setupFn, description);
    const unsubscribe = LIFETIME.link(result, setup);
    setups.add(setup);

    return () => {
      setups.delete(setup);
      unsubscribe();
    };
  };

  const formula = FormulaFn(() => {
    marker.consume();
    for (const setup of setups) {
      setup();
    }
  }, description);

  const result = { register, setups: formula };

  return result;
}
