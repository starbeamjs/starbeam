import { type Equality, Marker } from "@starbeam/core";
import { Stack } from "@starbeam/debug";

import { Collection } from "./collection.js";

const INTERNAL = Symbol("INTERNAL");
type INTERNAL = typeof INTERNAL;

export class TrackedMap<K = unknown, V = unknown> implements Map<K, V> {
  static reactive<M extends Map<unknown, unknown>>(map: M): M {
    return new TrackedMap(INTERNAL, new Map(map)) as unknown as M;
  }

  readonly #collection: Collection<K>;
  readonly #values: Marker;
  readonly #equals: Equality<V> = Object.is;
  readonly #vals: Map<K, V>;

  constructor();
  constructor(internal: INTERNAL, map: Map<K, V>);
  constructor(entries: readonly (readonly [K, V])[] | null);
  constructor(iterable: Iterable<readonly [K, V]>);
  constructor(
    ...args:
      | [INTERNAL, Map<K, V>]
      | [
          | readonly (readonly [K, V])[]
          | Iterable<readonly [K, V]>
          | null
          | undefined
        ]
  ) {
    if (args.length === 2 && args[0] === INTERNAL) {
      let [, map] = args;
      this.#vals = map;
    } else {
      let [existing] = args;
      // TypeScript doesn't correctly resolve the overloads for calling the `Map`
      // constructor for the no-value constructor. This resolves that.
      this.#vals = existing ? new Map<K, V>(existing) : new Map<K, V>();
    }

    this.#collection = Collection.create(
      `TrackedMap @ ${Stack.describeCaller()}`
    );

    this.#values = Marker(`TrackedMap @ ${Stack.describeCaller()}`);
  }

  // **** KEY GETTERS ****
  get(key: K): V | undefined {
    const has = this.#vals.has(key);

    this.#collection.get(key, has ? "hit" : "miss");
    return this.#vals.get(key);
  }

  has(key: K): boolean {
    const has = this.#vals.has(key);
    this.#collection.check(key, has ? "hit" : "miss");
    return has;
  }

  // **** ALL GETTERS ****
  entries(): IterableIterator<[K, V]> {
    this.#collection.iterate();
    this.#values.consume();
    return this.#vals.entries();
  }

  keys(): IterableIterator<K> {
    this.#collection.iterate();
    return this.#vals.keys();
  }

  values(): IterableIterator<V> {
    this.#collection.iterate();
    this.#values.consume();
    return this.#vals.values();
  }

  forEach(fn: (value: V, key: K, map: Map<K, V>) => void): void {
    this.#collection.iterate();
    this.#values.consume();
    this.#vals.forEach(fn);
  }

  get size(): number {
    this.#collection.iterate();
    return this.#vals.size;
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    this.#collection.iterate();
    this.#values.consume();
    return this.#vals[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }

  // **** KEY SETTERS ****
  set(key: K, value: V): this {
    const has = this.#vals.has(key);

    if (has) {
      const current = this.#vals.get(key);

      if (current !== undefined && this.#equals(current, value)) {
        return this;
      }
    } else {
      this.#collection.splice();
    }

    this.#values.update();
    this.#collection.set(key);
    this.#vals.set(key, value);

    return this;
  }

  delete(key: K): boolean {
    const has = this.#vals.has(key);

    if (!has) {
      return false;
    }

    this.#collection.splice();
    this.#values.update();
    this.#collection.delete(key);
    return this.#vals.delete(key);
  }

  // **** ALL SETTERS ****
  clear(): void {
    const hasItems = this.#vals.size > 0;

    if (!hasItems) {
      return;
    }

    this.#collection.splice();
    this.#values.update();
    this.#vals.clear();
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedMap.prototype, Map.prototype);

export class TrackedWeakMap<K extends object = object, V = unknown>
  implements WeakMap<K, V>
{
  readonly #collection: Collection<K>;
  readonly #vals: WeakMap<K, V>;
  readonly #equals: Equality<V> = Object.is;

  constructor();
  constructor(iterable: Iterable<readonly [K, V]>);
  constructor(entries: readonly [K, V][] | null);
  constructor(
    existing?: readonly [K, V][] | Iterable<readonly [K, V]> | null | undefined
  ) {
    // TypeScript doesn't correctly resolve the overloads for calling the `Map`
    // constructor for the no-value constructor. This resolves that.
    this.#vals = existing ? new WeakMap(existing) : new WeakMap();

    // FIXME: Avoid using a regular Map in Collection to avoid leaks. The best
    // thing to do would probably be to have a non-iterable, object-keyed
    // Collection that WeakMap and WeakSet can use.
    this.#collection = Collection.create(
      `TrackedWeakMap @ ${Stack.describeCaller()}`
    );
  }

  get(key: K): V | undefined {
    const has = this.#vals.has(key);

    this.#collection.get(key, has ? "hit" : "miss");
    return this.#vals.get(key);
  }

  has(key: K): boolean {
    const has = this.#vals.has(key);
    this.#collection.check(key, has ? "hit" : "miss");
    return has;
  }

  set(key: K, value: V): this {
    const has = this.#vals.has(key);

    if (has) {
      const current = this.#vals.get(key);

      if (current !== undefined && this.#equals(current, value)) {
        return this;
      }
    } else {
      this.#collection.splice();
    }

    this.#collection.set(key);
    this.#vals.set(key, value);

    return this;
  }

  delete(key: K): boolean {
    const has = this.#vals.has(key);

    if (!has) {
      return false;
    }

    this.#collection.delete(key);
    return this.#vals.delete(key);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakMap.prototype, WeakMap.prototype);
