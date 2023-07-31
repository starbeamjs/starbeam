import { CachedFormula, type FormulaFn } from "@starbeam/reactive";
import { link, pushingScope } from "@starbeam/runtime";
import {
  finalize,
  isFinalized,
  mountFinalizationScope,
  onFinalize,
} from "@starbeam/shared";

type Cleanup = () => void;
type SyncHandler = () => void | Cleanup;

/**
 * `SyncTo` defines a "synchronization process", which synchronizes reactive
 * state with an external store.
 *
 * > It cannot be used to copy data to a cell.
 *
 * ## Syntax
 *
 * ```ts
 * const sync = SyncTo((definition) => { ... });
 * ```
 *
 * ## Lifecycle: Setup
 *
 * The `setup` phase
 *
 * ## Lifecycle: Sync
 *
 * The setup function is called during
 *
 * @param define - A function where you define the behavior of your
 * synchronization process. This function receives an object, namely definition,
 * which is used to customize different stages of synchronization.
 *
 * @returns A function that, when invoked, initiates the set up for the
 *   synchronization process.
 *
 */
export function SyncTo(
  define: (definition: SyncDefinition) => void,
): () => Sync {
  return () => {
    const definition = new SyncDefinition();

    pushingScope(() => {
      // Call the user's definition function in the Definition's finalization
      // scope. This means that if the Definition is finalized, any finalizers
      // registered while the `define` function was running will also be run.
      define(definition);
    }, definition);

    return ResourceSyncTo(definition);
  };
}

export function ResourceSyncTo(definition: SyncDefinition): Sync {
  let last: SyncRun | undefined;

  return CachedFormula(() => {
    if (last) {
      if (isFinalized(last)) return;
      finalize(last);
    }

    last = new SyncRun(definition);
    link(definition, last);
    last.setup();
  });
}

export class SyncDefinition {
  static syncs = (definition: SyncDefinition) => definition.#syncs;

  readonly #syncs = new Set<SyncHandler>();

  readonly on = {
    sync: (setup: SyncHandler) => {
      this.#syncs.add(setup);
    },

    finalize: (cleanup: Cleanup) => {
      onFinalize(this, cleanup);
    },
  };
}

const getSyncs = SyncDefinition.syncs;

class SyncRun {
  readonly #definition: SyncDefinition;

  constructor(definition: SyncDefinition) {
    this.#definition = definition;
  }

  setup() {
    const done = mountFinalizationScope(this);
    for (const sync of getSyncs(this.#definition)) {
      const cleanup = sync();
      if (cleanup) onFinalize(this, cleanup);
    }
    done();
  }
}

export type Sync = FormulaFn<void>;
