import type { Equality } from "@starbeam/core";
import { type Description, callerStack } from "@starbeam/debug";

import { Collection } from "./collection.js";

export class TrackedWeakMap<K extends object = object, V = unknown>
  implements WeakMap<K, V>
{
  static reactive<K extends object, V>(
    description: Description
  ): WeakMap<K, V> {
    return new TrackedWeakMap(description) as WeakMap<K, V>;
  }

  readonly #collection: Collection<K>;
  readonly #vals: WeakMap<K, V>;
  readonly #equals: Equality<V> = Object.is;

  private constructor(description: Description) {
    // TypeScript doesn't correctly resolve the overloads for calling the `Map`
    // constructor for the no-value constructor. This resolves that.
    this.#vals = new WeakMap();

    // FIXME: Avoid using a regular Map in Collection to avoid leaks. The best
    // thing to do would probably be to have a non-iterable, object-keyed
    // Collection that WeakMap and WeakSet can use.
    this.#collection = Collection.create(description, this);
  }

  get(key: K): V | undefined {
    const has = this.#vals.has(key);

    this.#collection.get(key, has ? "hit" : "miss", " {entry}", callerStack());
    return this.#vals.get(key);
  }

  has(key: K): boolean {
    const has = this.#vals.has(key);
    this.#collection.check(
      key,
      has ? "hit" : "miss",
      " {entry}",
      callerStack()
    );
    return has;
  }

  set(key: K, value: V): this {
    const caller = callerStack();

    const has = this.#vals.has(key);

    if (has) {
      const current = this.#vals.get(key) as V;

      if (this.#equals(current, value)) {
        return this;
      }
    }

    this.#collection.set(
      key,
      has ? "key:stable" : "key:changes",
      " {entry}",
      caller
    );
    this.#vals.set(key, value);

    return this;
  }

  delete(key: K): boolean {
    const caller = callerStack();

    const has = this.#vals.has(key);

    if (!has) {
      return false;
    }

    this.#collection.delete(key, caller);
    return this.#vals.delete(key);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakMap.prototype, WeakMap.prototype);
