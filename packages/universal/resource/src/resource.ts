import type { Description } from "@starbeam/interfaces";
import { link, pushingScope } from "@starbeam/runtime";
import { mountFinalizationScope } from "@starbeam/shared";

import { ResourceSyncTo, type Sync, SyncDefinition } from "./sync.js";

const BLUEPRINTS = new WeakSet<IntoResourceBlueprint<unknown>>();

export type ResourceConstructor<T> = (definition: ResourceDefinition) => T;
export type IntoResourceBlueprint<T> =
  | ResourceConstructor<T>
  | ResourceBlueprint<T>;

export function Resource<const T>(
  define: (definition: ResourceDefinition) => T,
): ResourceBlueprint<T> {
  const blueprint = () => {
    const definition = new ResourceDefinition();

    // run the user's definition in the Definition's finalization scope, so that
    // any synchronization handlers registered while the `define` function was
    // running will also be run when the Definition is finalized.
    const value = pushingScope(() => define(definition), definition);
    const instance = new ResourceInstance(value, definition);
    link(definition, instance);
    return instance;
  };
  BLUEPRINTS.add(blueprint);
  return blueprint;
}

class ResourceDefinition {
  static getSyncTo = (definition: ResourceDefinition) => {
    return definition.#syncTo;
  };

  #definition: SyncDefinition;
  #syncTo: Sync;
  readonly on;

  constructor() {
    this.#definition = new SyncDefinition();
    this.#syncTo = ResourceSyncTo(this.#definition);
    this.on = this.#definition.on;

    link(this, this.#definition);
  }

  readonly use = <T>(blueprint: IntoResourceBlueprint<T>): T => {
    const done = mountFinalizationScope(this);
    const resource = use(blueprint);
    done();

    this.on.sync(() => {
      resource.sync();
    });

    return resource.value;
  };
}

const getSyncTo = ResourceDefinition.getSyncTo;

export interface UseFnOptions {
  readonly description?: Description | undefined;
}

/**
 * The `use` function instantiates resources (it's like `new`, but for
 * resources). It takes a resource blueprint or resource constructor and returns
 * a resource instance.
 *
 * When it receives a resource constructor, it behaves as if the `use` function
 * was called with a blueprint created from the constructor.
 */
export function use<T>(
  intoBlueprint: IntoResourceBlueprint<T>,
  _options?: UseFnOptions,
): ResourceInstance<T> {
  if (isResourceBlueprint(intoBlueprint)) {
    return intoBlueprint();
  } else {
    const blueprint = Resource(intoBlueprint);
    return blueprint();
  }
}

// export type Resource<T> = ResourceInstance<T>;

export function isResourceBlueprint<
  const B extends IntoResourceBlueprint<unknown>,
>(blueprint: B): blueprint is Extract<B, ResourceBlueprint<unknown>> {
  return BLUEPRINTS.has(blueprint);
}

export class ResourceInstance<T> {
  readonly #value: T;
  readonly #definition: ResourceDefinition;

  constructor(instance: T, definition: ResourceDefinition) {
    this.#value = instance;
    this.#definition = definition;
  }

  get sync(): Sync {
    return getSyncTo(this.#definition);
  }

  get value(): T {
    return this.#value;
  }
}

// export const getSync = ResourceInstance.getSync;
// export const getValue = ResourceInstance.getValue;

// export class ResourceDefinition {
//   static getSync(definition: ResourceDefinition): () => Sync {
//     let thisSync: Sync | undefined;

//     return () => {
//       if (!thisSync) {
//         thisSync = SyncTo(() => {
//           const done = mountFinalizationScope(definition);
//           const cleanups: (() => void)[] = [];

//           for (const sync of definition.#syncs) {
//             sync();
//           }

//           for (const setup of definition.#setups) {
//             const cleanup = setup();
//             if (cleanup) cleanups.push(cleanup);
//           }

//           done();

//           return () => {
//             for (const cleanup of cleanups) {
//               cleanup();
//             }
//           };
//         });
//       }

//       return CachedFormula(() => {
//         thisSync?.();

//         for (const sync of definition.#syncs) {
//           sync();
//         }
//       });
//     };
//   }

//   #setups = new Set<SetupHandler>();
//   #syncs = new Set<InactiveSync>();
//   #activeSyncs: null | Set<Sync> = null;
//   #finalize = new Set<() => void>();

//   constructor() {
//     this.#syncs.add(
//       SyncTo(() => {
//         const cleanups: (() => void)[] = [];

//         for (const sync of this.#syncs) {
//           sync();
//         }

//         for (const setup of this.#setups) {
//           const cleanup = setup();
//           if (cleanup) cleanups.push(cleanup);
//         }

//         return () => {
//           for (const cleanup of cleanups) {
//             cleanup();
//           }
//         };
//       }),
//     );
//   }

//   readonly use = <T>(blueprint: IntoResourceBlueprint<T>): T => {
//     const child = use(blueprint);
//     this.#syncs.add(getSync(child));

//     return getValue(child);
//   };

//   readonly on = {
//     setup: (handler: SetupHandler) => {
//       this.#setups.add(handler);
//     },

//     finalize: (handler: () => void) => {
//       onFinalize(this, handler);
//     },
//   };
// }

export type ResourceBlueprint<T> = () => ResourceInstance<T>;
