import { DisplayStruct } from "@starbeam/core-utils";
import type { Description } from "@starbeam/interfaces";
import {
  CachedFormula,
  Cell,
  DEBUG,
  Formula,
  read,
  type ReadValue,
} from "@starbeam/reactive";
import { RUNTIME, TAG } from "@starbeam/runtime";
import { verified } from "@starbeam/verify";
import { isPresent } from "@starbeam/verify";

import type { IntoResourceBlueprint, Resource } from "./api.js";
import { isResourceBlueprint, type ResourceBlueprint } from "./api.js";
import { type SetupBlock, Setups } from "./setup.js";
import { type ResourceCleanup, type ResourceConstructor } from "./types.js";

/**
 * `ResourceRun` is passed in to the user-specified `ResourceConstructor`
 * to create a new resource run. It's the lifetime of a single run of the
 * resource, so finalizing a resource run finalizes anything that was created in
 * its context (as long as it wasn't adopted by another run).
 */
export class ResourceRun {
  readonly #state: ResourceState;

  constructor(state: ResourceState) {
    this.#state = state;
  }

  readonly on = {
    /**
     * on.cleanup happens once for each run of the resource.
     */
    cleanup: (cleanup: ResourceCleanup): void => {
      RUNTIME.onFinalize(this, () => {
        cleanup();
      });
    },

    /**
     * on.finalize happens when the resource's lifetime is finalized. This is
     * primarily important for cleaning up state that persists across runs (such
     * as in ResourceList).
     */
    finalize: (cleanup: ResourceCleanup): void => {
      RUNTIME.onFinalize(this.#state.lifetime, cleanup);
    },

    setup: (block: SetupBlock): void => {
      this.#state.setups.add(block);
    },
  };

  use = <T>(
    resource: IntoResourceBlueprint<T>,
    options?: { description?: Description | undefined }
  ): Resource<T> => {
    const instance = ResourceBlueprintImpl.evaluate(resource, options ?? {});
    this.#state.setups.add(() => {
      setupResource(instance, this);
    });
    return instance;
  };
}

export type ResourceFor<R extends ResourceConstructor | ResourceBlueprint> =
  R extends ResourceConstructor<infer T> | ResourceBlueprint<infer T>
    ? Resource<T>
    : never;

export type ResourceStateFor<
  R extends ResourceConstructor | ResourceBlueprint
> = R extends ResourceConstructor<unknown> | ResourceBlueprint<unknown>
  ? ResourceState
  : never;

export interface ResourceState {
  /**
   * A resource's lifetime is the direct parent of the resource. The direct
   * parent is contained inside the root.
   */
  readonly lifetime: object;

  readonly setups: Setups;

  readonly description: Description | undefined;
}

export interface ResourceBlueprintParts<T> {
  readonly Constructor: ResourceConstructor<T>;
  readonly description: Description | undefined;
}

export class ResourceBlueprintImpl<T> {
  static create<T>(
    this: void,
    resource: ResourceConstructor<T>,
    description?: string | Description
  ): ResourceBlueprint<T> {
    return new ResourceBlueprintImpl(
      resource as ResourceConstructor,
      DEBUG?.Desc("resource", description)
    );
  }

  static from<T>(value: IntoResourceBlueprint<T>): ResourceBlueprint<T> {
    return isResourceBlueprint(value)
      ? value
      : ResourceBlueprintImpl.create(value);
  }

  static run<T>(
    this: void,
    blueprint: ResourceBlueprint<T>,
    run: ResourceRun
  ): Resource<T> {
    let instance = blueprint.#Constructor(run);

    while (isResourceBlueprint(instance)) {
      instance = ResourceBlueprintImpl.evaluate(instance, {});
    }

    return instance as Resource<T>;
  }

  static evaluate<T>(
    intoBlueprint: IntoResourceBlueprint<T>,
    options: { description?: Description | undefined } = {}
  ): Resource<T> {
    const blueprint = ResourceBlueprintImpl.from(intoBlueprint);
    return blueprint.#evaluate(options);
  }

  #Constructor: ResourceConstructor;
  #description: Description | undefined;

  constructor(
    Constructor: ResourceConstructor,
    description: Description | undefined
  ) {
    this.#Constructor = Constructor;
    this.#description = description;
  }

  #evaluate(options: { description?: Description | undefined }): Resource<T> {
    const Constructor = this.#Constructor as ResourceConstructor<T>;
    const description = options.description ?? this.#description;

    return evaluateResourceConstructor({ Constructor, description });
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
export function evaluateResourceConstructor<T>(
  blueprint: ResourceBlueprintParts<T>
): Resource<T> {
  let finalized = false;
  const lifetime = {};
  RUNTIME.onFinalize(lifetime, () => (finalized = true));

  let lastValue: ReadValue<T> | undefined;

  let last: ResourceRun | undefined;
  const isSetup = Cell<boolean>(
    false,
    blueprint.description?.implementation(
      "cell",
      "setup?",
      "is the resource set up yet?"
    )
  );

  const formula = CachedFormula(() => {
    // freeze the last value in place once the resource is finalized
    if (finalized) return lastValue;

    const { Constructor, description } = blueprint;
    const setups = Setups(lifetime);

    const state = {
      description,
      setups,
      lifetime,
    };

    const next = new ResourceRun(state);

    RUNTIME.link(lifetime, next);
    RUNTIME.link(next, setups);

    const instance = Constructor(next);

    if (isResourceBlueprint(instance)) {
      return ResourceBlueprintImpl.run(instance, next);
    }

    // Finalize the previous run after running the new one to give the new one a
    // chance to adopt resources from the previous run.
    if (last !== undefined) RUNTIME.finalize(last);
    last = next;

    return Formula(() => {
      // freeze the last value in place once the resource is finalized
      if (finalized) return lastValue;

      console.log({ isSetup: isSetup.current });

      // wait for the resource to be set up before polling the setups
      if (isSetup.current) setups.poll();

      return read(instance);
    });
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
  const resource = CachedFormula(() => {
    return (lastValue = read(formula.read()) as ReadValue<T>);
  }) as Resource<T>;

  // Associate the resource with its lifetime in a WeakMap. _Dynamic_ checks for
  // whether a value is a resource will use this WeakMap.
  RESOURCE_LIFETIMES.set(resource, lifetime);

  SETUP_RESOURCE.set(resource, {
    isSetup,
    resourceLifetime: lifetime,
  });

  return resource;
}

const SETUP_RESOURCE = new WeakMap<
  Resource<unknown>,
  { resourceLifetime: object; isSetup: Cell<boolean> }
>();

export function setupResource(
  resource: Resource<unknown>,
  lifetime: object
): void {
  const { resourceLifetime, isSetup } = verified(
    SETUP_RESOURCE.get(resource),
    isPresent
  );

  RUNTIME.link(lifetime, resourceLifetime);
  isSetup.set(true);
}
