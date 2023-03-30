import type { Unsubscribe } from "@starbeam/interfaces";
import { LIFETIME } from "@starbeam/runtime";

import { ResourceConstructorImpl } from "./constructor.js";
import type { ResourceInstance } from "./instance.js";
import type { ResourceConstructor } from "./types.js";

type Cleanup<M> = (metadata: M) => void;

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
