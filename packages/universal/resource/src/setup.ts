import { CachedFormula, type FormulaFn, Marker } from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";

export type SetupBlock = (lifetime: object) => undefined | void | (() => void);
export type Setup = FormulaFn<void>;

export function Setup(parent: object, block: SetupBlock): Setup {
  let lastCleanup: object | undefined;
  let finalized = false;

  RUNTIME.onFinalize(parent, () => (finalized = true));

  return CachedFormula(() => {
    if (finalized) return;

    if (lastCleanup) {
      RUNTIME.finalize(lastCleanup);
    }

    lastCleanup = {};
    const cleanup = block(lastCleanup);
    RUNTIME.onFinalize(lastCleanup, cleanup ?? undefined);
    RUNTIME.link(parent, lastCleanup);
  });
}

export interface Setups {
  add: (setup: SetupBlock) => void;
  poll: () => void;
}

export function Setups(parent: object): Setups {
  const lifetime = {};
  RUNTIME.link(parent, lifetime);

  const marker = Marker();
  const setupSet = new Set<Setup>();

  const poll = CachedFormula(() => {
    marker.read();

    for (const setup of setupSet) {
      setup();
    }
  });

  const setups = {
    add: (setup: SetupBlock) => {
      marker.mark();
      setupSet.add(Setup(lifetime, setup));
    },

    poll,
  };

  /**
   * Allow external code to finalize the Setups object, which will
   * then trigger the cleanup on each child {@linkcode Setup}.
   */
  RUNTIME.link(setups, lifetime);

  return setups;
}
