import type { Reactive } from "@starbeam/interfaces";

import type { ResourceBlueprint } from "./api.js";
import type { ResourceRun } from "./resource.js";

export type ResourceConstructor<T = unknown> = (
  run: ResourceRun
) => ResourceBlueprint<T> | Reactive<T> | T;

/**
 * A resource constructor is a user-defined function that runs for each resource
 * run.
 */
export type SpecificResourceConstructor<T> = (
  run: ResourceRun,

  /**
   * The `lifetime` parameter is the lifetime of the entire resource.
   */
  lifetime: object
) => T;

export type ResourceCleanup = () => void;
