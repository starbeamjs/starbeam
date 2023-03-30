import { DisplayStruct } from "@starbeam/debug";
import type { Description } from "@starbeam/interfaces";
import { CachedFormula, type FormulaFn, isFormulaFn } from "@starbeam/reactive";
import { LIFETIME, TAG } from "@starbeam/runtime";

export type UseResource<T, M> =
  | ResourceBlueprint<T, M>
  | (() => ResourceBlueprint<T, M>)
  | Resource<T>;

let id = 0;

/**
 * `ResourceRun` is passed in to the user-specified `ResourceConstructor`
 * to create a new resource run. It's the lifetime of a single run of the
 * resource, so finalizing a resource run finalizes anything that was created in
 * its context (as long as it wasn't adopted by another run).
 */
export class ResourceRun<M> {
  readonly #state: ResourceState<M>;
  readonly id = id++;

  constructor(state: ResourceState<M>) {
    this.#state = state;
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
  ): FormulaFn<unknown> => {
    return use(resource, { metadata, root: this.#state.root, lifetime: this });
  }) as UseMethod;
}

type UseMethod = (<T>(resource: UseResource<T, void>) => FormulaFn<T>) &
  (<T, M>(resource: UseResource<T, M>, metadata: M) => FormulaFn<T>);

export type Resource<T> = FormulaFn<T>;

function useResource<T>(
  resource: Resource<T>,
  state: ResourceState<unknown>
): Resource<T> {
  LIFETIME.link(state.lifetime, resource, { root: state.root });
  return resource;
}

function useResourceConstructor<T, M>(
  resource: ResourceConstructor<T, M>,
  state: ResourceState<M>
): Resource<T> {
  let last: ResourceRun<M> | undefined;
  const formula = CachedFormula(() => {
    const next = new ResourceRun(state);

    LIFETIME.link(state.lifetime, next, { root: state.root });
    const instance = resource(next, {
      metadata: state.metadata,
      lifetime: state.lifetime,
    });

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

  return formula;
}

/**
 * A  blueprint is a reactive object that evaluates to the current
 * resource run for a given resource constructor.
 */
export function use<T, M>(
  resource: UseResource<T, M>,
  state: ResourceState<M>
): Resource<T> {
  if (isFormulaFn<T>(resource)) {
    return useResource(resource, state);
  } else if (typeof resource === "function") {
    return resource().use(state);
  } else {
    return resource.use(state);
  }
}

interface ResourceState<M> {
  /**
   * A resource's metadata persists across runs of the resource.
   */
  readonly metadata: M;
  /**
   * A resource's root is the root of the resource tree. It is used to adopt
   * resources across runs.
   */
  readonly root: object;
  /**
   * A resource's lifetime is the direct parent of the resource. The direct
   * parent is contained inside the root.
   */
  readonly lifetime: object;
}

export interface ResourceBlueprint<T, M = void> {
  create: ((
    this: ResourceBlueprint<T>,
    options: {
      lifetime: object;
      metadata?: undefined;
    }
  ) => Resource<T>) &
    ((options: { lifetime: object; metadata: M }) => Resource<T>);
  use: (options: {
    lifetime: object;
    metadata: M;
    root: object;
  }) => Resource<T>;
}

export function Resource<T, M = void>(
  resource: ResourceConstructor<T, M>,
  _description?: string | Description
): ResourceBlueprint<T, M> {
  return {
    create: ({ lifetime, metadata }) => {
      return useResourceConstructor(resource, {
        lifetime,
        root: lifetime,
        metadata: metadata as M,
      });
    },
    use: ({
      lifetime,
      metadata,
      root,
    }: {
      lifetime: object;
      metadata: M;
      root: object;
    }) => {
      return useResourceConstructor(resource, {
        lifetime,
        metadata,
        root,
      });
    },
  };
}

/**
 * A resource constructor is a user-defined function that runs for each resource
 * run.
 */
type ResourceConstructor<T, M> = (
  run: ResourceRun<M>,
  /**
   * The `resource` parameter provides information about the entire resource
   * that persists across runs. It is useful when reusing state across runs. The
   * `lifetime` property makes it possible to link state to the entire lifetime
   * of the resource, which ensures that it it will get cleaned up, at the
   * latest, when the resource itself is finalized.
   */
  resource: { metadata: M; lifetime: object }
) => T;
type ResourceCleanup<M> = (metadata: M) => void;
