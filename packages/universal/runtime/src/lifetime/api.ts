import {
  finalize,
  linkToFinalizationScope,
  onFinalize,
} from "@starbeam/shared";

import type { ObjectLifetime, Unsubscribe } from "./object-lifetime.js";

class LifetimeAPI {
  readonly #associations = new WeakMap<object, ObjectLifetime>();

  readonly on = {
    cleanup: (object: object, handler: Unsubscribe): Unsubscribe => {
      if (!handler) return;

      onFinalize(object, handler);
    },
  };

  /**
   * Finalize an object. This will run all of the finalizers registered on the
   * object, then finalize all associated children.
   */
  finalize(object: object): void {
    finalize(object);
  }

  link(parent: object, child: object): Unsubscribe {
    return linkToFinalizationScope(child, parent);
  }

  unlink(parent: object, child: object): void {
    const parentLifetime = this.#associations.get(parent);

    if (parentLifetime) {
      const childLifetime = this.#associations.get(child);

      if (childLifetime) {
        parentLifetime.unlink(childLifetime);
      }
    }
  }
}

export const LIFETIME = new LifetimeAPI();
export type Lifetime = {
  [P in keyof LifetimeAPI]: LifetimeAPI[P];
};
