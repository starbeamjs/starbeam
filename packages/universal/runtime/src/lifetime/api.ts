import { ObjectLifetime, type Unsubscribe } from "./object-lifetime.js";

class LifetimeAPI {
  readonly #associations = new WeakMap<object, ObjectLifetime>();

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
