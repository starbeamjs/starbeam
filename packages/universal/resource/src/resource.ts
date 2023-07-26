import { linkToFinalizationScope, onFinalize } from "@starbeam/shared";

import { Sync } from "./sync.js";

const BLUEPRINTS = new WeakSet<IntoResourceBlueprint<unknown>>();

export type SetupHandler = () => void | (() => void);

export type ResourceConstructor<T> = (definition: ResourceDefinition) => T;
export type IntoResourceBlueprint<T> =
  | ResourceConstructor<T>
  | ResourceBlueprint<T>;

export function Resource<const T>(
  constructor: ResourceConstructor<T>,
): ResourceBlueprint<T> {
  const blueprint = () => {
    const definition = new ResourceDefinition();
    linkToFinalizationScope(definition);

    return new ResourceInstance(constructor(definition), definition);
  };
  BLUEPRINTS.add(blueprint);
  return blueprint;
}

export type Resource<T> = ResourceInstance<T>;

export function isResourceBlueprint<
  const B extends IntoResourceBlueprint<unknown>,
>(blueprint: B): blueprint is Extract<B, ResourceBlueprint<unknown>> {
  return BLUEPRINTS.has(blueprint);
}

export class ResourceInstance<T> {
  static getSync = (instance: ResourceInstance<unknown>): (() => Sync) => {
    return ResourceDefinition.getSync(instance.#definition);
  };

  static getValue = <T>(instance: ResourceInstance<T>): T => {
    return instance.#value;
  };

  readonly #value: T;
  readonly #definition: ResourceDefinition;

  constructor(instance: T, definition: ResourceDefinition) {
    this.#value = instance;
    this.#definition = definition;

    linkToFinalizationScope(this);
  }
}

export const getSync = ResourceInstance.getSync;
export const getValue = ResourceInstance.getValue;

export class ResourceDefinition {
  static getSync(definition: ResourceDefinition): () => Sync {
    return () =>
      Sync(() => {
        const cleanups: (() => void)[] = [];

        for (const setup of definition.#setups) {
          const cleanup = setup();
          if (cleanup) cleanups.push(cleanup);
        }

        return () => {
          for (const cleanup of cleanups) {
            cleanup();
          }
        };
      })(definition);
  }

  #setups = new Set<SetupHandler>();
  #finalize = new Set<() => void>();

  readonly on = {
    setup: (handler: SetupHandler) => {
      this.#setups.add(handler);
    },

    finalize: (handler: () => void) => {
      onFinalize(this, handler);
    },
  };
}

export type ResourceBlueprint<T> = () => ResourceInstance<T>;
