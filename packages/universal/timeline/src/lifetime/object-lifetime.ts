import { inspector } from "@starbeam/debug";

export type Unsubscribe = () => void;

export class ObjectLifetime {
  static create(): ObjectLifetime {
    return new ObjectLifetime();
  }

  static finalize(
    lifetime: ObjectLifetime,
    finalizing?: (block: () => void) => void
  ): void {
    lifetime.#finalizeIn(finalizing);
  }

  #finalizers: Set<() => void> = new Set();
  #children: Set<ObjectLifetime> = new Set();
  #finalized = false;

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

  readonly on = {
    finalize: (finalizer: () => void): Unsubscribe => {
      this.#finalizers.add(finalizer);
      return () => this.#finalizers.delete(finalizer);
    },
  };

  link(child: ObjectLifetime): Unsubscribe {
    this.#children.add(child);
    return () => this.#children.delete(child);
  }

  unlink(child: ObjectLifetime): void {
    this.#children.delete(child);
  }

  #finalizeIn(finalizing?: (block: () => void) => void) {
    if (this.#finalized) {
      return;
    }

    this.#finalized = true;

    if (finalizing) {
      finalizing(() => {
        this.#finalize();
      });
    } else {
      this.#finalize();
    }
  }

  #finalize() {
    for (const finalizer of this.#finalizers) {
      finalizer();
    }

    for (const child of this.#children) {
      child.#finalize();
    }
  }
}
