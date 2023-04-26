import type { Description } from "@starbeam/interfaces";
import { DEBUG } from "@starbeam/universal";

import { Collection } from "./collection.js";

export class TrackedWeakSet<T extends object = object> implements WeakSet<T> {
  static reactive(description: Description | undefined): TrackedWeakSet {
    return new TrackedWeakSet(description);
  }

  readonly #collection: Collection<T>;
  readonly #vals: WeakSet<T>;

  private constructor(description: Description | undefined) {
    this.#collection = Collection.create(description, this);
    this.#vals = new WeakSet();
  }

  has(value: T): boolean {
    DEBUG?.markEntryPoint([
      "collection:has",
      this.#collection.description ?? "reactive.WeakSet",
      value,
    ]);

    const has = this.#vals.has(value);

    this.#collection.check(value, has ? "hit" : "miss", " {value}");

    return has;
  }

  add(value: T): this {
    const has = this.#vals.has(value);

    if (has) {
      return this;
    }

    DEBUG?.markEntryPoint([
      "collection:insert",
      this.#collection.description ?? "reactive.WeakSet",
      value,
    ]);

    this.#vals.add(value);
    this.#collection.set(value, "key:changes", " {value}");

    return this;
  }

  delete(value: T): boolean {
    const has = this.#vals.has(value);

    // if the value is not in the set, deleting it has no effect on consumers
    if (!has) {
      return false;
    }

    DEBUG?.markEntryPoint([
      "collection:delete",
      this.#collection.description ?? "reactive.WeakSet",
      value,
    ]);

    this.#collection.delete(value);
    return this.#vals.delete(value);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakSet.prototype, WeakSet.prototype);
