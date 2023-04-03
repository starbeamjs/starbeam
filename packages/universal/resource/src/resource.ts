import { Desc, DisplayStruct } from "@starbeam/debug";
import type { Description } from "@starbeam/interfaces";
import { CachedFormula, read, type ReadValue } from "@starbeam/reactive";
import { LIFETIME, TAG } from "@starbeam/runtime";

import type { IntoResourceBlueprint, Resource } from "./api.js";
import { isResourceBlueprint, type ResourceBlueprint } from "./api.js";
import { type ResourceCleanup, type ResourceConstructor } from "./types.js";

/**
 * `ResourceRun` is passed in to the user-specified `ResourceConstructor`
 * to create a new resource run. It's the lifetime of a single run of the
 * resource, so finalizing a resource run finalizes anything that was created in
 * its context (as long as it wasn't adopted by another run).
 */
export class ResourceRun<M> {
  readonly #state: ResourceState<M>;

  constructor(state: ResourceState<M>) {
    this.#state = state;
  }

  readonly on = {
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

  use = <T, M = void>(
    resource: IntoResourceBlueprint<T, M>,
    ...options: UseArgs<M, { description?: Description | undefined }>
  ): Resource<T> => {
    return ResourceBlueprintImpl.evaluate(resource, options[0] ?? {}, this);
  };
}

type UseArgs<M, R> = M extends void
  ? [options?: UseOptions<void, R>]
  : [options: UseOptions<M, R>];

export type ResourceFor<R extends ResourceConstructor | ResourceBlueprint> =
  R extends ResourceConstructor<infer T> | ResourceBlueprint<infer T>
    ? Resource<T>
    : never;

export type ResourceStateFor<
  R extends ResourceConstructor | ResourceBlueprint
> = R extends
  | ResourceConstructor<unknown, infer M>
  | ResourceBlueprint<unknown, infer M>
  ? ResourceState<M>
  : never;

export type UseOptions<M, Defaults> = M extends void
  ? Defaults & { readonly metadata?: void }
  : Defaults & { readonly metadata: M };

export interface ResourceState<M> {
  /**
   * A resource's metadata persists across runs of the resource.
   */
  readonly metadata: M;

  /**
   * A resource's lifetime is the direct parent of the resource. The direct
   * parent is contained inside the root.
   */
  readonly lifetime: object;

  readonly description: Description;
}

export interface ResourceBlueprintParts<T, M> {
  readonly Constructor: ResourceConstructor<T, M>;
  readonly metadata: M;
  readonly description: Description;
}

export class ResourceBlueprintImpl<T, M = void> {
  static create<T, M = void>(
    this: void,
    resource: ResourceConstructor<T, M>,
    description?: string | Description
  ): ResourceBlueprint<T, M> {
    return new ResourceBlueprintImpl(
      resource as ResourceConstructor,
      undefined,
      Desc("resource", description)
    );
  }

  static from<T, M>(
    value: IntoResourceBlueprint<T, M>
  ): ResourceBlueprint<T, M> {
    return isResourceBlueprint(value)
      ? value
      : ResourceBlueprintImpl.create(value);
  }

  static run<T, M>(
    this: void,
    blueprint: ResourceBlueprint<T, void>,
    run: ResourceRun<M>,
    lifetime: object
  ): Resource<T> {
    let instance = blueprint.#Constructor(run, {}, lifetime);

    while (isResourceBlueprint(instance)) {
      instance = ResourceBlueprintImpl.evaluate(instance, {}, lifetime);
    }

    return instance as Resource<T>;
  }

  static evaluate<T, M>(
    intoBlueprint: IntoResourceBlueprint<T, M>,
    options: {
      metadata?: M | undefined | void;
      description?: Description | undefined;
    },
    lifetime: object
  ): Resource<T> {
    const blueprint = ResourceBlueprintImpl.from(intoBlueprint);
    const Constructor = blueprint.#Constructor as ResourceConstructor<T, M>;
    const metadata = options.metadata ?? (blueprint.#metadata as M);
    const description = options.description ?? blueprint.#description;

    if (lifetime === undefined) {
      console.trace({ blueprint, options, lifetime });
    }

    return evaluateResourceConstructor(
      {
        Constructor,
        metadata,
        description,
      },
      lifetime
    );
  }

  #Constructor: ResourceConstructor;
  #metadata: unknown;
  #description: Description;

  constructor(
    Constructor: ResourceConstructor,
    metadata: unknown,
    description: Description
  ) {
    this.#Constructor = Constructor;
    this.#metadata = metadata;
    this.#description = description;
  }

  metadata(metadata: M): ResourceBlueprint<T, void> {
    return new ResourceBlueprintImpl(
      this.#Constructor,
      metadata,
      this.#description
    ) as unknown as ResourceBlueprint<T, void>;
  }
}

const RESOURCE_LIFETIMES = new WeakMap<Resource<unknown>, object>();

export function lifetime(resource: Resource<unknown>): object {
  return RESOURCE_LIFETIMES.get(resource) as object;
}

export function isResource<T>(value: unknown): value is Resource<T> {
  return RESOURCE_LIFETIMES.has(value as Resource<unknown>);
}

/**
 * Evaluate a resource constructor, returning a resource instance. This function
 * is the workhorse of the resource system. It handles creating resource runs,
 * finalizing previous runs, and linking lifetimes.
 */
export function evaluateResourceConstructor<T, M>(
  blueprint: ResourceBlueprintParts<T, M>,
  lifetime: object
): Resource<T> {
  let last: ResourceRun<M> | undefined;
  const formula = CachedFormula(() => {
    const { Constructor, metadata, description } = blueprint;

    const state = {
      metadata,
      description,
      lifetime,
    };
    const next = new ResourceRun(state);

    LIFETIME.link(lifetime, next);
    const instance = Constructor(next, metadata, lifetime);

    if (isResourceBlueprint(instance)) {
      return ResourceBlueprintImpl.run(instance, next, lifetime);
    }

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

  // Declare that this formula is a `Resource`, which gives it a non-existent
  // symbol key.
  const resource = CachedFormula(
    () => read(formula.current) as ReadValue<T>
  ) as Resource<T>;

  // Associate the resource with its lifetime in a WeakMap. _Dynamic_ checks for
  // whether a value is a resource will use this WeakMap.
  RESOURCE_LIFETIMES.set(resource, lifetime);

  return resource;
}
