import {
  type TrackedStorage,
  createStorage,
  getValue,
  setValue,
} from "./tracked-shim.js";

export class TrackedSet<T = unknown> implements Set<T> {
  readonly #collection = createStorage(null, () => false);
  readonly #storages: Map<T, TrackedStorage<null>> = new Map();
  readonly #vals: Set<T>;

  #storageFor(key: T): TrackedStorage<null> {
    const storages = this.#storages;
    let storage = storages.get(key);

    if (storage === undefined) {
      storage = createStorage(null, () => false);
      storages.set(key, storage);
    }

    return storage;
  }

  #dirtyStorageFor(key: T): void {
    const storage = this.#storages.get(key);

    if (storage) {
      setValue(storage, null);
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
    getValue(this.#storageFor(value));

    return this.#vals.has(value);
  }

  // **** ALL GETTERS ****
  entries(): IterableIterator<[T, T]> {
    getValue(this.#collection);

    return this.#vals.entries();
  }

  keys(): IterableIterator<T> {
    getValue(this.#collection);

    return this.#vals.keys();
  }

  values(): IterableIterator<T> {
    getValue(this.#collection);

    return this.#vals.values();
  }

  forEach(fn: (value1: T, value2: T, set: Set<T>) => void): void {
    getValue(this.#collection);

    this.#vals.forEach(fn);
  }

  get size(): number {
    getValue(this.#collection);

    return this.#vals.size;
  }

  [Symbol.iterator](): IterableIterator<T> {
    getValue(this.#collection);

    return this.#vals[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }

  // **** KEY SETTERS ****
  add(value: T): this {
    this.#dirtyStorageFor(value);
    setValue(this.#collection, null);

    this.#vals.add(value);

    return this;
  }

  delete(value: T): boolean {
    this.#dirtyStorageFor(value);
    setValue(this.#collection, null);

    return this.#vals.delete(value);
  }

  // **** ALL SETTERS ****
  clear(): void {
    this.#storages.forEach((s) => setValue(s, null));
    setValue(this.#collection, null);

    this.#vals.clear();
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedSet.prototype, Set.prototype);

export class TrackedWeakSet<T extends object = object> implements WeakSet<T> {
  readonly #storages: WeakMap<T, TrackedStorage<null>> = new WeakMap();
  readonly #vals: WeakSet<T>;

  #storageFor(key: T): TrackedStorage<null> {
    const storages = this.#storages;
    let storage = storages.get(key);

    if (storage === undefined) {
      storage = createStorage(null, () => false);
      storages.set(key, storage);
    }

    return storage;
  }

  #dirtyStorageFor(key: T): void {
    const storage = this.#storages.get(key);

    if (storage) {
      setValue(storage, null);
    }
  }

  constructor(values?: readonly T[] | null) {
    this.#vals = new WeakSet(values);
  }

  has(value: T): boolean {
    getValue(this.#storageFor(value));

    return this.#vals.has(value);
  }

  add(value: T): this {
    // Add to vals first to get better error message
    this.#vals.add(value);

    this.#dirtyStorageFor(value);

    return this;
  }

  delete(value: T): boolean {
    this.#dirtyStorageFor(value);

    return this.#vals.delete(value);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakSet.prototype, WeakSet.prototype);
