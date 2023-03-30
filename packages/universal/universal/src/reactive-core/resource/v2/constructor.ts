import { ResourceInstance } from "./instance.js";
import { ResourceState } from "./state.js";
import type { UpdateResource } from "./types.js";

export class ResourceConstructorImpl<T, M> {
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

export type ResourceConstructor<T, M> = ResourceConstructorImpl<T, M>;
export const ResourceConstructor = ResourceConstructorImpl.create;
