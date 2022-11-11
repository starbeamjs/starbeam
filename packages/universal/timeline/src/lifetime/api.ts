import { expected, isEqual, verify } from "@starbeam/verify";

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
  readonly #roots = new WeakMap<
    object,
    { root: object; unlink: Unsubscribe }
  >();

  readonly on = {
    cleanup: (object: object, handler: () => void): Unsubscribe => {
      let lifetime = this.#associations.get(object);

      if (!lifetime) {
        lifetime = ObjectLifetime.create(object);
        this.#associations.set(object, lifetime);
      }

      return lifetime.on.finalize(handler);
    },
  };

  /**
   * Finalize an object. This will run all of the finalizers registered on the
   * object, then finalize all associated children.
   */
  finalize(object: object): void {
    const lifetime = this.#associations.get(object);

    if (lifetime) {
      ObjectLifetime.finalize(lifetime);
    }
  }

  #initialize(object: object): ObjectLifetime {
    let lifetime = this.#associations.get(object);

    if (!lifetime) {
      lifetime = ObjectLifetime.create(object);
      this.#associations.set(object, lifetime);
    }

    return lifetime;
  }

  link(parent: object, child: object, options?: { root: object }): Unsubscribe {
    const parentLifetime = this.#initialize(parent);
    const childLifetime = this.#initialize(child);

    if (options?.root) {
      const existingRoot = this.#roots.get(child);

      if (existingRoot) {
        verify(
          existingRoot.root,
          isEqual(options.root),
          expected("a root passed to link")
            .toBe("the same as the previous root")
            .butGot("a different root")
        );

        existingRoot.unlink();
      }

      const unlink = parentLifetime.link(childLifetime);
      this.#roots.set(child, {
        root: options.root,
        unlink,
      });
      return unlink;
    } else {
      return parentLifetime.link(childLifetime);
    }
  }

  unlink(parent: object, child: object): void {
    console.group({ unlinking: [parent, child] });

    const parentLifetime = this.#associations.get(parent);

    if (parentLifetime) {
      const childLifetime = this.#associations.get(child);

      if (childLifetime) {
        console.log("found child lifetime", { parent, child });
        parentLifetime.unlink(childLifetime);
      }
    }

    console.groupEnd();
  }
}

export const LIFETIME = new LifetimeAPI();
export type Lifetime = {
  [P in keyof LifetimeAPI]: LifetimeAPI[P];
};
