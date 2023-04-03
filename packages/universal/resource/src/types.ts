import type { Reactive } from "@starbeam/interfaces";

import type { ResourceBlueprint } from "./api.js";
import type { ResourceRun } from "./resource.js";

export type ResourceConstructor<T = unknown, M = unknown> =
  | SpecificResourceConstructor<ResourceBlueprint<T, void>, M>
  | SpecificResourceConstructor<Reactive<T>, M>
  | SpecificResourceConstructor<T, M>;

/**
 * A resource constructor is a user-defined function that runs for each resource
 * run.
 */
export type SpecificResourceConstructor<T, M> = (
  run: ResourceRun<M>,
  /**
   * The `metadata` parameter provides information about the entire resource
   * that persists across runs. It is useful when reusing state across runs. The
   * `lifetime` property makes it possible to link state to the entire lifetime
   * of the resource, which ensures that it it will get cleaned up, at the
   * latest, when the resource itself is finalized.
   */
  metadata: M,

  /**
   * The `lifetime` parameter is the lifetime of the entire resource.
   */
  lifetime: object
) => T;

export type ResourceCleanup<M> = (metadata: M) => void;
