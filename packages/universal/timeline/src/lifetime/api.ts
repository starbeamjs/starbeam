import { expected, isPresent, verify } from "@starbeam/verify";

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
  readonly link: (child: object) => Unsubscribe;
  readonly on: OnCleanup;
}

export interface OnCleanup {
  readonly cleanup: (finalizer: () => void) => Unsubscribe;
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

  adopt(oldParent: object, newParent: object, child: object): Unsubscribe {
    const oldParentLifetime = this.#associations.get(oldParent);
    const childLifetime = this.#associations.get(child);

    verify(
      oldParentLifetime,
      isPresent,
      expected("a previous parent internal lifetime").when("adopting")
    );

    verify(
      childLifetime,
      isPresent,
      expected("a previous child internal lifetime").when("adopting")
    );

    console.log({ before: oldParentLifetime });
    oldParentLifetime.unlink(childLifetime);
    console.log({ after: oldParentLifetime });
    return this.#initialize(newParent).link(childLifetime);
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
  finalize(object: object, finalizing?: (block: () => void) => void): void {
    const lifetime = this.#associations.get(object);

    if (lifetime) {
      ObjectLifetime.finalize(lifetime, finalizing);
    }
  }

  #initialize(object: object): ObjectLifetime {
    let lifetime = this.#associations.get(object);

    if (!lifetime) {
      lifetime = ObjectLifetime.create();
      this.#associations.set(object, lifetime);
    }

    return lifetime;
  }

  link(parent: object, child: object): Unsubscribe {
    const parentLifetime = this.#initialize(parent);
    const childLifetime = this.#initialize(child);

    return parentLifetime.link(childLifetime);
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
