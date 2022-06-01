import { type Unsubscribe, ObjectLifetime } from "./object-lifetime.js";

/**
 * Implement this interface if you are building a new abstraction that wants to
 * expose cleanup in an idiomatic way.
 *
 * Note that users could always use `LIFETIME.on.cleanup(object, handler)` and
 * `LIFETIME.link(parent, child)` directly, but {@link CleanupTarget} is a way
 * to add cleanup support to objects consistently and idiomatically.
 */
export interface CleanupTarget {
  link(child: object): Unsubscribe;
  readonly on: OnCleanup;
}

export interface OnCleanup {
  cleanup(finalizer: () => void): Unsubscribe;
}

class LifetimeAPI {
  readonly #associations = new WeakMap<object, ObjectLifetime>();

  readonly on = {
    cleanup: (object: object, handler: () => void): Unsubscribe => {
      let lifetime = this.#associations.get(object);

      if (!lifetime) {
        lifetime = ObjectLifetime.create();
        this.#associations.set(object, lifetime);
      }

      return lifetime.on.finalize(handler);
    },
  };

  link(parent: object, child: object): Unsubscribe {
    let parentLifetime = this.#initialize(parent);
    let childLifetime = this.#initialize(child);

    return parentLifetime.link(childLifetime);
  }

  #initialize(object: object): ObjectLifetime {
    let lifetime = this.#associations.get(object);

    if (!lifetime) {
      lifetime = ObjectLifetime.create();
      this.#associations.set(object, lifetime);
    }

    return lifetime;
  }

  /**
   * Finalize an object.
   *
   * The second parameter is optional, and allows the caller to pass a callback
   * that the finalization will run inside of.
   *
   * This allows the caller to catch any errors that may occur during
   * finalization inside of an appropriate context.
   */
  finalize(object: object, finalizing?: (block: () => void) => void) {
    const lifetime = this.#associations.get(object);

    if (lifetime) {
      ObjectLifetime.finalize(lifetime, finalizing);
    }
  }
}

export const LIFETIME = new LifetimeAPI();
export type Lifetime = {
  [P in keyof LifetimeAPI]: LifetimeAPI[P];
};
