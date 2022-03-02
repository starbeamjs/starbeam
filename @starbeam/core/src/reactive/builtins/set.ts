import type { Marker } from "@starbeam/reactive";
import { COORDINATOR } from "@starbeam/schedule";
import { consume, createMarker, mark } from "./tracked-shim.js";

export class TrackedSet<T = unknown> implements Set<T> {
  readonly #marker: Marker = createMarker("entire set");
  readonly #markersByValue: Map<T, Marker> = new Map();
  readonly #vals: Set<T>;

  #markerFor(key: T): Marker {
    const markers = this.#markersByValue;
    let marker = markers.get(key);

    if (marker === undefined) {
      marker = createMarker();
      markers.set(key, marker);
    }

    return marker;
  }

  #dirtyMarkerFor(key: T): void {
    const marker = this.#markersByValue.get(key);

    if (marker) {
      mark(marker);
    }
  }

  constructor();
  constructor(values: readonly T[] | null);
  constructor(iterable: Iterable<T>);
  constructor(existing?: readonly T[] | Iterable<T> | null | undefined) {
    this.#vals = new Set(existing);
  }

  // **** KEY GETTERS ****
  has(value: T): boolean {
    // consume()
    consume(this.#markerFor(value));

    return this.#vals.has(value);
  }

  // **** ALL GETTERS ****
  entries(): IterableIterator<[T, T]> {
    consume(this.#marker);

    return this.#vals.entries();
  }

  keys(): IterableIterator<T> {
    consume(this.#marker);

    return this.#vals.keys();
  }

  values(): IterableIterator<T> {
    consume(this.#marker);

    return this.#vals.values();
  }

  forEach(fn: (value1: T, value2: T, set: Set<T>) => void): void {
    consume(this.#marker);

    this.#vals.forEach(fn);
  }

  get size(): number {
    consume(this.#marker);

    return this.#vals.size;
  }

  [Symbol.iterator](): IterableIterator<T> {
    consume(this.#marker);

    return this.#vals[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }

  // **** KEY SETTERS ****
  add(value: T): this {
    const tx = COORDINATOR.begin("Set#add");
    this.#dirtyMarkerFor(value);
    mark(this.#marker);

    this.#vals.add(value);
    tx.commit();

    return this;
  }

  delete(value: T): boolean {
    const tx = COORDINATOR.begin("Set#delete");
    this.#dirtyMarkerFor(value);
    mark(this.#marker);

    const deleted = this.#vals.delete(value);
    tx.commit();
    return deleted;
  }

  // **** ALL SETTERS ****
  clear(): void {
    const tx = COORDINATOR.begin("Set#clear");
    this.#markersByValue.forEach((s) => mark(s));
    mark(this.#marker);

    this.#vals.clear();
    tx.commit();
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedSet.prototype, Set.prototype);

export class TrackedWeakSet<T extends object = object> implements WeakSet<T> {
  readonly #markersByValue: WeakMap<T, Marker> = new WeakMap();
  readonly #marker: WeakSet<T>;

  #markerFor(key: T): Marker {
    const markers = this.#markersByValue;
    let marker = markers.get(key);

    if (marker === undefined) {
      marker = createMarker(`WeakSet member`);
      markers.set(key, marker);
    }

    return marker;
  }

  #dirtyStorageFor(key: T): void {
    const marker = this.#markersByValue.get(key);

    if (marker) {
      mark(marker);
    }
  }

  constructor(values?: readonly T[] | null) {
    this.#marker = new WeakSet(values);
  }

  has(value: T): boolean {
    consume(this.#markerFor(value));

    return this.#marker.has(value);
  }

  add(value: T): this {
    const tx = COORDINATOR.begin("WeakSet#add");
    // Add to vals first to get better error message
    this.#marker.add(value);

    this.#dirtyStorageFor(value);
    tx.commit();

    return this;
  }

  delete(value: T): boolean {
    const tx = COORDINATOR.begin("WeakSet#delete");
    this.#dirtyStorageFor(value);

    const deleted = this.#marker.delete(value);
    tx.commit();
    return deleted;
  }

  get [Symbol.toStringTag](): string {
    return this.#marker[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakSet.prototype, WeakSet.prototype);
