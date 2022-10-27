import { inspector } from "@starbeam/debug";

export type Unsubscribe = () => void;

export class ObjectLifetime {
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

  static create(): ObjectLifetime {
    return new ObjectLifetime();
  }

  static finalize(
    lifetime: ObjectLifetime,
    finalizing?: (block: () => void) => void
  ): void {
    lifetime.#finalizeIn(finalizing);
  }

  #finalize(): void {
    for (const finalizer of this.#finalizers) {
      finalizer();
    }

    for (const child of this.#children) {
      child.#finalize();
    }
  }

  #finalizeIn(finalizing?: (block: () => void) => void): void {
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

  link(child: ObjectLifetime): Unsubscribe {
    this.#children.add(child);
    return () => this.#children.delete(child);
  }

  unlink(child: ObjectLifetime): void {
    this.#children.delete(child);
  }
}
