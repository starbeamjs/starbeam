interface AbstractSet<T> {
  add(value: T): void;
  delete(value: T): void;
  has(value: T): boolean;
}

interface AbstractIterableSet<T> extends AbstractSet<T> {
  [Symbol.iterator](): IterableIterator<T>;
}

interface AbstractMap<K, V> {
  set(key: K, value: V): this;
  delete(key: K): void;
  has(key: K): boolean;
  get(key: K): V | undefined;
}

interface AbstractIterableMap<K, V> extends AbstractMap<K, V> {
  [Symbol.iterator](): IterableIterator<[K, V]>;
  entries(): IterableIterator<[K, V]>;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
}

interface Merge<Collection, Value> {
  (collection: Collection, value: Value): Collection | void;
}

interface Create<Collection> {
  (): Collection;
}

interface MapDelegate<Collection, Value> {
  create: Create<Collection>;
  merge: Merge<Collection, Value>;
  delete: (collection: Collection, value: Value) => void;
  has: (collection: Collection, value: Value) => boolean;
  size: (collection: Collection) => number;
}

interface IterableMapDelegate<Collection, Value>
  extends MapDelegate<Collection, Value> {
  iterate(collection: Collection): IterableIterator<Value>;
}

export class MapOf<K, Collection, Value> {
  static create<K, Collection, Value>(
    map: AbstractMap<K, Collection>,
    delegate: MapDelegate<Collection, Value>
  ): MapOf<K, Collection, Value> {
    return new MapOf(map, delegate);
  }

  static getMap<K, Collection, Value>(
    map: MapOf<K, Collection, Value>
  ): AbstractMap<K, Collection> {
    return map.#map;
  }

  readonly #map: AbstractMap<K, Collection>;
  readonly #delegate: MapDelegate<Collection, Value>;

  protected constructor(
    map: AbstractMap<K, Collection>,
    delegate: MapDelegate<Collection, Value>
  ) {
    this.#map = map;
    this.#delegate = delegate;
  }

  insert(key: K, value: Value) {
    const collection = this.#getOrCreate(key);
    const merged = this.#delegate.merge(collection, value);

    if (merged !== undefined) {
      this.#map.set(key, merged);
    }
  }

  update(
    key: K,
    updater: (collection: Collection) => Collection | void
  ): Collection | null {
    const collection = this.#get(key);

    if (!collection) {
      return null;
    }

    const next = updater(collection);

    if (next === undefined) {
      return collection;
    } else {
      this.#map.set(key, next);
      return next;
    }
  }

  get(key: K): Collection | null {
    return this.#map.get(key) ?? null;
  }

  hasValue(key: K, value: Value): boolean {
    const collection = this.#get(key);

    if (!collection) {
      return false;
    }

    return this.#delegate.has(collection, value);
  }

  has(key: K) {
    return this.#map.has(key);
  }

  delete(key: K, ...values: Value[]) {
    const collection = this.#get(key);

    if (collection) {
      for (const value of values) {
        this.#delegate.delete(collection, value);
      }

      if (this.#delegate.size(collection) === 0) {
        this.#map.delete(key);
      }
    }
  }

  #get(key: K): Collection | null {
    return this.#map.get(key) ?? null;
  }

  #getOrCreate(key: K): Collection {
    let collection = this.#map.get(key);

    if (!collection) {
      collection = this.#delegate.create();
      this.#map.set(key, collection);
    }

    return collection;
  }
}

export class IterableMapOf<K, Collection, Value>
  extends MapOf<K, Collection, Value>
  implements Iterable<[K, Collection]>
{
  static create<K, Collection, Value>(
    map: AbstractIterableMap<K, Collection>,
    delegate: IterableMapDelegate<Collection, Value>
  ) {
    return new IterableMapOf(map, delegate);
  }

  readonly #map: AbstractIterableMap<K, Collection>;
  readonly #delegate: IterableMapDelegate<Collection, Value>;

  private constructor(
    map: AbstractIterableMap<K, Collection>,
    delegate: IterableMapDelegate<Collection, Value>
  ) {
    super(map, delegate);
    this.#map = map;
    this.#delegate = delegate;
  }

  [Symbol.iterator]() {
    return this.#map.entries();
  }

  keys(): IterableIterator<K> {
    return this.#map.keys();
  }

  *values(): IterableIterator<Value> {
    for (const [key, values] of this) {
      for (const value of this.#delegate.iterate(values)) {
        yield value;
      }
    }
  }
}

class SetDelegate<V> implements MapDelegate<Set<V>, V> {
  create(): Set<V> {
    return new Set();
  }

  delete(set: Set<V>, value: V): void {
    set.delete(value);
  }

  has(set: Set<V>, value: V): boolean {
    return set.has(value);
  }

  merge(set: Set<V>, value: V) {
    set.add(value);
  }

  size(set: Set<V>): number {
    return set.size;
  }
}

const SET_DELEGATE = new SetDelegate();

class IterableSetDelegate<V>
  extends SetDelegate<V>
  implements IterableMapDelegate<Set<V>, V>
{
  iterate(collection: Set<V>): IterableIterator<V> {
    return collection.values();
  }
}

export function MapOfSet<K, V>(): MapOfSet<K, V> {
  return IterableMapOf.create<K, Set<V>, V>(
    new Map<K, Set<V>>(),
    new IterableSetDelegate<V>()
  );
}

export type MapOfSet<K, V> = IterableMapOf<K, Set<V>, V>;

export function WeakMapOfSet<K extends object, V>(): WeakMapOfSet<K, V> {
  return MapOf.create<K, Set<V>, V>(
    new WeakMap<K, Set<V>>(),
    new SetDelegate<V>()
  );
}

export type WeakMapOfSet<K extends object, V> = MapOf<K, Set<V>, V>;
