import { type Description, callerStack } from "@starbeam/debug";

import { Collection } from "./collection.js";

export class TrackedWeakSet<T extends object = object> implements WeakSet<T> {
  static reactive(description: Description): TrackedWeakSet {
    return new TrackedWeakSet(description);
  }

  readonly #collection: Collection<T>;
  readonly #vals: WeakSet<T>;

  private constructor(description: Description) {
    this.#collection = Collection.create(description, this);
    this.#vals = new WeakSet();
  }

  has(value: T): boolean {
    const caller = callerStack();

    const has = this.#vals.has(value);

    this.#collection.check(value, has ? "hit" : "miss", " {value}", caller);

    return has;
  }

  add(value: T): this {
    const has = this.#vals.has(value);

    if (has) {
      return this;
    }

    const caller = callerStack();

    this.#vals.add(value);
    this.#collection.set(value, "key:changes", " {value}", caller);

    return this;
  }

  delete(value: T): boolean {
    const has = this.#vals.has(value);

    // if the value is not in the set, deleting it has no effect on consumers
    if (!has) {
      return false;
    }

    const caller = callerStack();

    this.#collection.delete(value, caller);
    return this.#vals.delete(value);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakSet.prototype, WeakSet.prototype);
