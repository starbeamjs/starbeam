import { LIFETIME } from "@starbeam/runtime";
import { UNINITIALIZED } from "@starbeam/shared";
import { isNotEqual, verified } from "@starbeam/verify";

import { CreateResourceRun } from "./run.js";
import type { ExposedFinalized, RunResult, UpdateResource } from "./types.js";

export class ResourceState<out T = unknown, out M = unknown> {
  static create<T, M = undefined>(
    update: UpdateResource<T, M>,
    metadata: M,
    owner = {}
  ): ResourceState<T, M> {
    const state = new ResourceState(update, metadata, owner);
    LIFETIME.link(owner, state);
    return state;
  }

  static scoped<T, M = undefined>(
    update: UpdateResource<T, M>,
    metadata: M,
    { owner, root }: { owner: object; root: object }
  ): ResourceState<T, M> {
    const state = new ResourceState(update, metadata, owner);
    LIFETIME.link(owner, state, { root });
    return state;
  }

  /**
   * The root lifetime of a resource is the lifetime of the top resource in a
   * resource tree. Resources created within the root (via `use`) will be
   * automatically adopted from one run to the next.
   */
  #root: object;
  #instance: T | UNINITIALIZED = UNINITIALIZED;
  readonly #metadata: M;
  readonly #update: UpdateResource<T, unknown>;
  #run: CreateResourceRun<M> | null = null;

  /**
   * Once the resource is finalized, its `nextRun` method will return
   * `{done: true, metadata: metadata}`.
   */
  #isFinalized = false;

  private constructor(update: UpdateResource<T, M>, metadata: M, root: object) {
    this.#update = update as UpdateResource<T, unknown>;
    this.#metadata = metadata;
    this.#root = root;

    LIFETIME.on.cleanup(this, () => {
      this.#isFinalized = true;
    });
  }

  get #lastInstance(): T {
    // The only way for this to happen is if the resource is finalized before it
    // was ever consumed, and then it is consumed later. This should be avoided
    // by construction, but there is still some work to do there.
    return verified(this.#instance, isNotEqual(UNINITIALIZED));
  }

  adopt(parent: object, { root }: { root: object }): void {
    LIFETIME.link(parent, this, { root });
  }

  nextRun(): RunResult<T, M> {
    if (this.#isFinalized) {
      return finalized(this.#lastInstance, this.#metadata);
    }

    const prevRun = this.#run;

    const run = this.#createRun();
    const result = next(this.#update(run, this.#metadata), this.#metadata);
    this.#instance = result.value.instance;

    if (prevRun) LIFETIME.finalize(prevRun);

    return result;
  }

  #createRun(): CreateResourceRun<M> {
    const run = (this.#run = CreateResourceRun.create(
      this.#metadata,
      this.#root
    ));
    LIFETIME.link(this, run);
    return run;
  }

  get isFinalized(): boolean {
    return this.#isFinalized;
  }

  get metadata(): M {
    return this.#metadata;
  }
}

function next<T, M>(instance: T, metadata: M): RunResult<T, M> {
  return {
    done: false,
    value: {
      instance,
      metadata,
    },
  };
}

function finalized<T, M>(
  instance: T,
  metadata: M
): { done: true; value: ExposedFinalized<T, M> } {
  return {
    done: true,
    value: {
      instance,
      metadata,
    },
  };
}
