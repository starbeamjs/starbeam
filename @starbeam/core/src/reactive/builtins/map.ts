import type { Marker } from "@starbeam/reactive";
import { COORDINATOR } from "@starbeam/schedule";
import { consume, createMarker, mark } from "./tracked-shim.js";

const INTERNAL = Symbol("INTERNAL");
type INTERNAL = typeof INTERNAL;

export class TrackedMap<K = unknown, V = unknown> implements Map<K, V> {
  static reactive<M extends Map<unknown, unknown>>(map: M): M {
    return new TrackedMap(INTERNAL, new Map(map)) as unknown as M;
  }

  readonly #marker: Marker = createMarker();
  readonly #markersByKey: Map<K, Marker> = new Map();
  readonly #vals: Map<K, V>;

  #initializeMarkerFor(key: K): Marker {
    const markers = this.#markersByKey;
    let marker = markers.get(key);

    if (marker === undefined) {
      marker = createMarker();
      markers.set(key, marker);
    }

    return marker;
  }

  #getMarkerFor(key: K): Marker | undefined {
    return this.#markersByKey.get(key);
  }

  #readMarkerFor(key: K): void {
    const marker = this.#initializeMarkerFor(key);

    consume(marker);
  }

  #dirtyStorageFor(key: K): void {
    const marker = this.#getMarkerFor(key);

    if (marker) {
      mark(marker);
    }
  }

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
      this.#vals = existing ? new Map(existing) : new Map();
    }
  }

  // **** KEY GETTERS ****
  get(key: K): V | undefined {
    // entangle the storage for the key
    this.#readMarkerFor(key);

    return this.#vals.get(key);
  }

  has(key: K): boolean {
    this.#readMarkerFor(key);

    return this.#vals.has(key);
  }

  // **** ALL GETTERS ****
  entries(): IterableIterator<[K, V]> {
    consume(this.#marker);

    return this.#vals.entries();
  }

  keys(): IterableIterator<K> {
    consume(this.#marker);

    return this.#vals.keys();
  }

  values(): IterableIterator<V> {
    consume(this.#marker);

    return this.#vals.values();
  }

  forEach(fn: (value: V, key: K, map: Map<K, V>) => void): void {
    consume(this.#marker);

    this.#vals.forEach(fn);
  }

  get size(): number {
    consume(this.#marker);

    return this.#vals.size;
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    consume(this.#marker);

    return this.#vals[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }

  // **** KEY SETTERS ****
  set(key: K, value: V): this {
    const tx = COORDINATOR.begin(`Map.set(${key})`);

    this.#dirtyStorageFor(key);
    mark(this.#marker);

    this.#vals.set(key, value);

    tx.commit();

    return this;
  }

  delete(key: K): boolean {
    let tx = COORDINATOR.begin(`Map.delete(${key})`);

    this.#dirtyStorageFor(key);
    mark(this.#marker);

    tx.commit();

    return this.#vals.delete(key);
  }

  // **** ALL SETTERS ****
  clear(): void {
    let tx = COORDINATOR.begin(`Map.clear()`);

    this.#markersByKey.forEach(mark);
    mark(this.#marker);

    tx.commit();

    this.#vals.clear();
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedMap.prototype, Map.prototype);

export class TrackedWeakMap<K extends object = object, V = unknown>
  implements WeakMap<K, V>
{
  readonly #markersByKey: WeakMap<K, Marker> = new WeakMap();
  readonly #vals: WeakMap<K, V>;

  #initializeStorageFor(key: K): Marker {
    const markers = this.#markersByKey;
    let marker = markers.get(key);

    if (marker === undefined) {
      marker = createMarker(`TrackedWeakMap entry`);
      markers.set(key, marker);
    }

    return marker;
  }

  #readStorageFor(key: K): void {
    const marker = this.#initializeStorageFor(key);

    consume(marker);
  }

  #dirtyStorageFor(key: K): void {
    const marker = this.#markersByKey.get(key);

    if (marker) {
      mark(marker);
    }
  }

  constructor();
  constructor(iterable: Iterable<readonly [K, V]>);
  constructor(entries: readonly [K, V][] | null);
  constructor(
    existing?: readonly [K, V][] | Iterable<readonly [K, V]> | null | undefined
  ) {
    // TypeScript doesn't correctly resolve the overloads for calling the `Map`
    // constructor for the no-value constructor. This resolves that.
    this.#vals = existing ? new WeakMap(existing) : new WeakMap();
  }

  get(key: K): V | undefined {
    this.#readStorageFor(key);

    return this.#vals.get(key);
  }

  has(key: K): boolean {
    this.#readStorageFor(key);

    return this.#vals.has(key);
  }

  set(key: K, value: V): this {
    this.#dirtyStorageFor(key);

    this.#vals.set(key, value);

    return this;
  }

  delete(key: K): boolean {
    this.#dirtyStorageFor(key);

    return this.#vals.delete(key);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakMap.prototype, WeakMap.prototype);
