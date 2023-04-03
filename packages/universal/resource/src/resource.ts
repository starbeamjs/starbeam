import { Desc, DisplayStruct } from "@starbeam/debug";
import type { Description } from "@starbeam/interfaces";
import {
  CachedFormula,
  type FormulaFn,
  isFormulaFn,
  read,
  type ReadValue,
} from "@starbeam/reactive";
import { LIFETIME, TAG } from "@starbeam/runtime";

import type {
  ResourceCleanup,
  ResourceConstructor,
  UseMethod,
  UseResource,
} from "./types.js";

/**
 * `ResourceRun` is passed in to the user-specified `ResourceConstructor`
 * to create a new resource run. It's the lifetime of a single run of the
 * resource, so finalizing a resource run finalizes anything that was created in
 * its context (as long as it wasn't adopted by another run).
 */
export class ResourceRun<M> {
  readonly #state: ResourceState<M>;

  constructor(state: ResourceOptions<M>) {
    this.#state = {
      metadata: undefined,
      ...state,
    } as ResourceState<M>;
  }

  on = {
    /**
     * on.cleanup happens once for each run of the resource.
     */
    cleanup: (cleanup: ResourceCleanup<M>): void => {
      LIFETIME.on.cleanup(this, () => {
        cleanup(this.#state.metadata);
      });
    },

    /**
     * on.finalize happens when the resource's lifetime is finalized. This is
     * primarily important for cleaning up state that persists across runs (such
     * as in ResourceList).
     */
    finalize: (cleanup: ResourceCleanup<M>): void => {
      LIFETIME.on.cleanup(this.#state.lifetime, () => {
        cleanup(this.#state.metadata);
      });
    },
  };

  use = ((
    resource: UseResource<unknown, unknown>,
    metadata?: unknown
  ): FormulaFn<unknown> =>
    use(resource, { metadata, lifetime: this })) as UseMethod;
}

/**
 * A  blueprint is a reactive object that evaluates to the current
 * resource run for a given resource constructor.
 */
export function use<T, M>(
  resource: UseResource<T, M>,
  options: ResourceOptions<M>
): Resource<ReadValue<T>> {
  if (isFormulaFn<T>(resource)) {
    return resource as Resource<ReadValue<T>>;
  } else if (typeof resource === "function") {
    return useResourceConstructor(resource, options);
  } else {
    return useResourceConstructor(
      ResourceBlueprint.Constructor(resource),
      options
    );
  }
}

export type ResourceOptions<M> = M extends void
  ? Omit<ResourceState<undefined>, "metadata"> & {
      readonly metadata?: undefined;
    }
  : ResourceState<M>;

interface ResourceState<M> {
  /**
   * A resource's metadata persists across runs of the resource.
   */
  readonly metadata: M;

  /**
   * A resource's lifetime is the direct parent of the resource. The direct
   * parent is contained inside the root.
   */
  readonly lifetime: object;
}

// export interface ResourceBlueprint<T, M = void> {
//   metadata: (metadata: M) => ResourceBlueprint<T, void>;
// }

export type Resource<T> = FormulaFn<T>;

export class ResourceBlueprint<T, M = void> {
  static create<T, M = void>(
    this: void,
    resource: ResourceConstructor<T, M>,
    description?: string | Description
  ): ResourceBlueprint<ReadValue<T>, M> {
    return new ResourceBlueprint(
      resource,
      Desc("resource", description)
    ) as ResourceBlueprint<ReadValue<T>, M>;
  }

  static Constructor<T, M>(
    blueprint: ResourceBlueprint<T, M>
  ): ResourceConstructor<T, M> {
    return blueprint.#Constructor;
  }

  #Constructor: ResourceConstructor<T, M>;
  #description: Description;

  constructor(construct: ResourceConstructor<T, M>, description: Description) {
    this.#Constructor = construct;
    this.#description = description;
  }

  metadata(metadata: M): ResourceBlueprint<T, void> {
    return Resource((run, _, lifetime) =>
      this.#Constructor(run as ResourceRun<M>, metadata, lifetime)
    ) as ResourceBlueprint<T, void>;
  }
}

export const Resource = ResourceBlueprint.create;

const RESOURCE_LIFETIMES = new WeakMap<Resource<unknown>, object>();

export function lifetime(resource: Resource<unknown>): object {
  return RESOURCE_LIFETIMES.get(resource) as object;
}

function useResourceConstructor<T, M>(
  resource: ResourceConstructor<T, M>,
  options: ResourceOptions<M>
): Resource<ReadValue<T>> {
  let last: ResourceRun<M> | undefined;
  const formula = CachedFormula(() => {
    const next = new ResourceRun(options);

    LIFETIME.link(options.lifetime, next);
    const instance = resource(next, options.metadata as M, options.lifetime);

    // Finalize the previous run after running the new one to give the new one a
    // chance to adopt resources from the previous run.
    if (last !== undefined) LIFETIME.finalize(last);
    last = next;

    return instance;
  });

  if (import.meta.env.DEV) {
    Object.defineProperty(formula, Symbol.for("nodejs.util.inspect.custom"), {
      configurable: true,
      value: () => {
        return DisplayStruct("Resource", {
          tag: formula[TAG],
        });
      },
    });
  }

  const instance = CachedFormula(() => read(formula.current) as ReadValue<T>);

  RESOURCE_LIFETIMES.set(instance, options.lifetime);

  return instance;
}
