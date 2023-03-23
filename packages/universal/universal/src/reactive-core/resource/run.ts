import { type Description, Desc } from "@starbeam/debug";
import type { Reactive, ReactiveValue } from "@starbeam/interfaces";
import { type Unsubscribe, LIFETIME } from "@starbeam/timeline";

import type { Handler, Resource, ResourceBlueprint } from "./resource";
import type { ResourceState } from "./state.js";

/**
 * A `ResourceRun` represents a single run of a resource constructor. Whenever the dependencies of
 * the previous run of the resource constructor change, a new `ResourceRun` is created and the
 * previous one is finalized.
 *
 * If a resource that was used in this run was also used in the previous run, it will be adopted by
 * the new run and not finalized.
 */

const INITIAL_ID = 0;

export class ResourceRun {
  static getOwner(run: ResourceRun): object {
    return run.#owner;
  }

  static NEXT_ID = INITIAL_ID;

  readonly id: number;
  readonly #desc: Description;
  readonly #state: ResourceState<unknown>;
  readonly #owner: object;

  readonly on = {
    cleanup: (handler: Handler): Unsubscribe => {
      return LIFETIME.on.cleanup(this, handler);
    },
  };

  constructor(owner: object, state: ResourceState<unknown>, desc: Description) {
    this.#owner = owner;
    this.#state = state;
    this.#desc = desc;
    this.id = ResourceRun.NEXT_ID++;
  }

  readonly use = <T>(
    resource: ResourceBlueprint<T> | ReactiveValue<T> | Resource<T> | T,
    options?: { description?: string | Description | undefined }
  ): Reactive<T> => {
    return this.#state.assimilateResourceReturn({
      resource,
      nextRun: this,
      desc: Desc("resource", options?.description ?? this.#desc.detail("use")),
    }) as Reactive<T>;
  };
}
