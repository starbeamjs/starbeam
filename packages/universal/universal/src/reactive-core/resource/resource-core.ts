import type { Reactive, Unsubscribe } from "@starbeam/interfaces";
import { CachedFormula, isReactive } from "@starbeam/reactive";
import { LIFETIME } from "@starbeam/runtime";
import { UNINITIALIZED } from "@starbeam/shared";
import { isNotEqual, verified } from "@starbeam/verify";

type Cleanup<M> = (metadata: M) => void;

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

export class CreateResourceRun<out M> {
  static create<M>(metadata: M, root: object): CreateResourceRun<M> {
    return new CreateResourceRun(metadata, root);
  }

  readonly #metadata: M;
  readonly #root: object;
  readonly #cleanups = new Set<Cleanup<unknown>>();

  private constructor(metadata: M, root: object) {
    this.#metadata = metadata;
    this.#root = root;
    LIFETIME.on.cleanup(this, () => {
      this.#cleanup();
    });
  }

  readonly on = {
    cleanup: (fn: (metadata: M) => void): Unsubscribe => {
      this.#cleanups.add(fn as Cleanup<unknown>);
      return () => this.#cleanups.delete(fn as Cleanup<unknown>);
    },
  };

  use = <T, M>(
    resource: ResourceConstructor<T, M> | ResourceInstance<T, M>
  ): ResourceInstance<T, M> => {
    if (resource instanceof ResourceConstructorImpl) {
      return resource.use({ within: this, root: this.#root });
    } else {
      resource.adopt(this.#root);
      return resource;
    }
  };

  #cleanup(): void {
    for (const cleanup of this.#cleanups) {
      cleanup(this.#metadata);
    }
  }
}

class ResourceConstructorImpl<T, M> {
  static create<T, M>(
    this: void,
    metadata: M,
    update: UpdateResource<T, M>
  ): ResourceConstructor<T, M> {
    return new ResourceConstructorImpl(update, metadata);
  }

  readonly #metadata: M;
  readonly #update: UpdateResource<T, M>;

  constructor(update: UpdateResource<T, M>, metadata: M) {
    this.#metadata = metadata;
    this.#update = update;
  }

  create({ within }: { within: object }): ResourceInstance<T, M> {
    const state = ResourceState.create(this.#update, this.#metadata, within);
    return ResourceInstance.create(state, within);
  }

  use({
    within,
    root,
  }: {
    within: object;
    root: object;
  }): ResourceInstance<T, M> {
    const state = ResourceState.scoped(this.#update, this.#metadata, {
      owner: within,
      root,
    });
    return ResourceInstance.create(state, within);
  }
}

export const ResourceConstructor = ResourceConstructorImpl.create;
export type ResourceConstructor<T, M> = ResourceConstructorImpl<T, M>;

type Assimilate<T, U> = (value: T) => U;

class ResourceInstance<T, M> {
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

export function assimilateResource<T>(value: T | Reactive<T>): T {
  if (isReactive(value)) {
    return value.current;
  } else {
    return value;
  }
}

export function getRunInstance<T>(
  result: Reactive<RunResult<T, unknown>>
): T | undefined {
  return result.current.value.instance;
}

export function updateResource<T, M>(
  updater: UpdateResource<T, M>
): UpdateResource<T, M> {
  return updater;
}

type UpdateResource<T, M> = (run: CreateResourceRun<M>, metadata: M) => T;

type RunResult<T, M> = IteratorResult<Exposed<T, M>, ExposedFinalized<T, M>>;

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

interface ExposedFinalized<T, M> {
  readonly instance: T;
  readonly metadata: M;
}

interface Exposed<T, M> {
  readonly instance: T;
  readonly metadata: M;
}
