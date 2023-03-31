import type { FormulaFn } from "@starbeam/reactive";

import type { Resource, ResourceBlueprint, ResourceRun } from "./resource.js";

export type UseResource<T, M> =
  | ResourceBlueprint<T, M>
  | ResourceConstructor<T, M>
  | Resource<T>;

export type UseMethod = (<T>(resource: UseResource<T, void>) => FormulaFn<T>) &
  (<T, M>(resource: UseResource<T, M>, metadata: M) => FormulaFn<T>);

/**
 * A resource constructor is a user-defined function that runs for each resource
 * run.
 */
export type ResourceConstructor<T, M> = (
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

export type ResourceCleanup<M> = (metadata: M) => void;
