import type { Reactive } from "@starbeam/interfaces";
import { CachedFormula } from "@starbeam/reactive";

import type { ResourceState } from "./state.js";
import type { Assimilate, RunResult } from "./types.js";

export class ResourceInstance<T, M> {
  static create<T, M>(
    state: ResourceState<T, M>,
    root: object
  ): ResourceInstance<T, M> {
    return new ResourceInstance(
      state,
      CachedFormula(() => state.nextRun()),
      root
    );
  }

  readonly #state: ResourceState<T, M>;
  readonly #instance: Reactive<RunResult<T, M>>;
  readonly #root: object;

  private constructor(
    state: ResourceState<T, M>,
    resourceInstance: Reactive<RunResult<T, M>>,
    root: object
  ) {
    this.#state = state;
    this.#instance = resourceInstance;
    this.#root = root;
  }

  adopt(parent: object): void {
    this.#state.adopt(parent, { root: this.#root });
  }

  metadata(): Reactive<M> {
    return CachedFormula(() => this.#instance.current.value.metadata);
  }

  instance(): Reactive<T>;
  instance<U>(fn: Assimilate<T, U>): Reactive<U>;
  instance(fn?: Assimilate<T, unknown>): Reactive<unknown> {
    return CachedFormula(() => {
      const instance = this.#instance.current.value.instance;
      return fn ? fn(instance) : instance;
    });
  }
}
