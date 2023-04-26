import { inspector } from "@starbeam/core-utils";

export type Unsubscribe = undefined | (() => void);

export class ObjectLifetime {
  #owner: WeakRef<object> | undefined;
  readonly #object: WeakRef<object>;
  readonly #children = new Set<ObjectLifetime>();
  #finalized = false;
  readonly #finalizers = new Set<() => void>();

  readonly on = {
    finalize: (finalizer: () => void): Unsubscribe => {
      this.#finalizers.add(finalizer);
      return () => this.#finalizers.delete(finalizer);
    },
  };

  static {
    if (import.meta.env.DEV) {
      inspector(this, "ObjectLifetime").define((lifetime, debug) =>
        debug.struct({
          finalizers: lifetime.#finalizers,
          children: lifetime.#children,
          finalized: lifetime.#finalized,
        })
      );
    }
  }

  static create(object: object): ObjectLifetime {
    return new ObjectLifetime(undefined, object);
  }

  static finalize(lifetime: ObjectLifetime): void {
    lifetime.#finalize();
  }

  constructor(owner: object | undefined, object: object) {
    this.#owner = owner ? new WeakRef(owner) : undefined;
    this.#object = new WeakRef(object);
  }

  get owner(): object | undefined {
    return this.#owner?.deref();
  }

  get object(): object | undefined {
    return this.#object.deref();
  }

  setOwnedBy(owner: object): { prev: object | undefined } {
    this.#owner = new WeakRef(owner);
    return { prev: this.#owner.deref() };
  }

  #finalize(): void {
    if (this.#finalized) {
      return;
    }

    this.#finalized = true;

    for (const finalizer of this.#finalizers) {
      finalizer();
    }

    for (const child of this.#children) {
      child.#finalize();
    }
  }

  link(child: ObjectLifetime): Unsubscribe {
    this.#children.add(child);
    return () => this.#children.delete(child);
  }

  unlink(child: ObjectLifetime): void {
    this.#children.delete(child);
  }
}
