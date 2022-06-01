import { Stack } from "@starbeam/debug";

import { Collection } from "./collection.js";

export class TrackedSet<T = unknown> implements Set<T> {
  readonly #collection: Collection<T>;
  readonly #vals: Set<T>;

  constructor();
  constructor(values: readonly T[] | null);
  constructor(iterable: Iterable<T>);
  constructor(existing?: readonly T[] | Iterable<T> | null | undefined) {
    this.#vals = new Set(existing);
    this.#collection = Collection.create(
      `TrackedSet @ ${Stack.describeCaller()}`
    );
  }

  // **** KEY GETTERS ****
  has(value: T): boolean {
    const has = this.#vals.has(value);

    this.#collection.check(value, has ? "hit" : "miss");

    return has;
  }

  // **** ALL GETTERS ****
  entries(): IterableIterator<[T, T]> {
    this.#collection.iterate();
    return this.#vals.entries();
  }

  keys(): IterableIterator<T> {
    this.#collection.iterate();
    return this.#vals.keys();
  }

  values(): IterableIterator<T> {
    this.#collection.iterate();
    return this.#vals.values();
  }

  forEach(fn: (value1: T, value2: T, set: Set<T>) => void): void {
    this.#collection.iterate();
    this.#vals.forEach(fn);
  }

  get size(): number {
    // It's definitely possible to do better than invalidating this any time the
    // collection is modified at all, but it may not be worth the effort.
    this.#collection.iterate();
    return this.#vals.size;
  }

  [Symbol.iterator](): IterableIterator<T> {
    this.#collection.iterate();
    return this.#vals[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }

  // **** KEY SETTERS ****
  add(value: T): this {
    const has = this.#vals.has(value);

    if (has) {
      return this;
    }

    this.#collection.splice();
    this.#collection.set(value);
    this.#vals.add(value);

    return this;
  }

  delete(value: T): boolean {
    const has = this.#vals.has(value);

    // if the value is not in the set, deleting it has no effect on consumers
    if (!has) {
      return false;
    }

    this.#collection.splice();
    this.#collection.delete(value);
    return this.#vals.delete(value);
  }

  // **** ALL SETTERS ****
  clear(): void {
    const hasItems = this.#vals.size > 0;

    if (!hasItems) {
      return;
    }

    this.#collection.splice();
    this.#vals.clear();
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedSet.prototype, Set.prototype);

export class TrackedWeakSet<T extends object = object> implements WeakSet<T> {
  readonly #collection: Collection<T>;
  readonly #vals: WeakSet<T>;

  constructor(values?: readonly T[] | null) {
    this.#collection = Collection.create(
      `TrackedWeakSet @ ${Stack.describeCaller()}`
    );
    this.#vals = new WeakSet(values);
  }

  has(value: T): boolean {
    const has = this.#vals.has(value);

    this.#collection.check(value, has ? "hit" : "miss");

    return has;
  }

  add(value: T): this {
    const has = this.#vals.has(value);

    if (has) {
      return this;
    }

    this.#vals.add(value);
    this.#collection.set(value);

    return this;
  }

  delete(value: T): boolean {
    const has = this.#vals.has(value);

    // if the value is not in the set, deleting it has no effect on consumers
    if (!has) {
      return false;
    }

    this.#collection.delete(value);
    return this.#vals.delete(value);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakSet.prototype, WeakSet.prototype);
