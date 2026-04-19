import type { Description } from "@starbeam/interfaces";
import type { Equality } from "@starbeam/reactive";
import { Cell, Marker } from "@starbeam/reactive";
import { UNINITIALIZED } from "@starbeam/shared";

class Entry<V> {
  static initialized<V>(
    value: V,
    desc: Description | undefined,
    equality: Equality<V>,
  ): Entry<V> {
    return new Entry(
      Cell<UNINITIALIZED | V>(value, {
        description: desc,
        equals: equals(equality),
      }),
      Cell(true, {
        description: desc?.implementation(
          "cell",
          "initialized?",
          "the entry was initialized",
        ),
      }),
    );
  }

  static uninitialized<V>(
    desc: Description | undefined,
    equality: Equality<V>,
  ): Entry<V> {
    return new Entry(
      Cell<UNINITIALIZED | V>(UNINITIALIZED, {
        description: desc,
        equals: equals(equality),
      }),
      Cell(false, {
        description: desc?.implementation(
          "cell",
          "initialized?",
          "the entry was initialized",
        ),
      }),
    );
  }

  readonly #initialized: Cell<boolean>;
  readonly #value: Cell<V | UNINITIALIZED>;

  constructor(value: Cell<V | UNINITIALIZED>, initialized: Cell<boolean>) {
    this.#value = value;
    this.#initialized = initialized;
  }

  delete(): "deleted" | "unchanged" {
    const cell = this.#value.read();

    if (cell === UNINITIALIZED) {
      return "unchanged";
    } else {
      this.#initialized.set(false);
      this.#value.set(UNINITIALIZED);
      return "deleted";
    }
  }

  get(): V | undefined {
    const current = this.#value.read();

    if (current === UNINITIALIZED) {
      return undefined;
    } else {
      return current;
    }
  }

  isPresent(): boolean {
    return this.#initialized.read();
  }

  set(value: V): "initialized" | "updated" | "unchanged" {
    if (this.#value.read() === UNINITIALIZED) {
      this.#value.set(value);
      this.#initialized.set(true);
      return "initialized";
    } else {
      return this.#value.set(value) ? "updated" : "unchanged";
    }
  }
}

function equals<T>(equality: Equality<T>): Equality<T | UNINITIALIZED> {
  return (a, b) => {
    if (a === UNINITIALIZED || b === UNINITIALIZED) {
      return Object.is(a, b);
    }

    return equality(a, b);
  };
}

const EMPTY_MAP_SIZE = 0;

export class ReactiveMap<K, V> implements Map<K, V> {
  /** @public */
  readonly [Symbol.toStringTag] = "Map";
  readonly #description: Description | undefined;
  readonly #entries = new Map<K, Entry<V>>();
  readonly #equality: Equality<V>;
  readonly #keys: Marker;
  readonly #values: Marker;

  static reactive<K, V>(
    equality: Equality<V>,
    description: Description | undefined,
  ): ReactiveMap<K, V> {
    return new ReactiveMap(description, equality);
  }

  private constructor(
    description: Description | undefined,
    equality: Equality<V>,
  ) {
    this.#description = description;
    this.#equality = equality;
    this.#keys = Marker({ description: description?.key("keys") });
    this.#values = Marker({ description: description?.key("values") });
  }

  get size(): number {
    this.#keys.read();

    let size = 0;

    for (const [, entry] of this.#iterate()) {
      if (entry.isPresent()) {
        size++;
      }
    }

    return size;
  }

  /** @public */
  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }

  clear(): void {
    if (this.#entries.size > EMPTY_MAP_SIZE) {
      this.#entries.clear();
      this.#keys.mark();
      this.#values.mark();
    }
  }

  delete(key: K): boolean {
    const entry = this.#entries.get(key);

    if (entry) {
      const disposition = entry.delete();

      if (disposition === "deleted") {
        this.#entries.delete(key);
        this.#keys.mark();
        this.#values.mark();
        return true;
      }
    }

    return false;
  }

  *entries(): MapIterator<[K, V]> {
    this.#keys.read();
    this.#values.read();

    for (const [key, value] of this.#iterate()) {
      yield [key, value.get() as V];
    }
  }

  #entry(key: K): Entry<V> {
    let entry = this.#entries.get(key);

    if (entry === undefined) {
      entry = Entry.uninitialized(
        this.#description?.key(
          typeof key === "string" || typeof key === "number"
            ? String(key)
            : "entry",
        ),
        this.#equality,
      );
      this.#entries.set(key, entry);
    }

    return entry;
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: unknown,
  ): void {
    this.#keys.read();
    this.#values.read();

    for (const [key, entry] of this.#entries) {
      callbackfn.call(thisArg, entry.get() as V, key, this);
    }
  }

  get(key: K): V | undefined {
    const entry = this.#entry(key);
    return entry.get();
  }

  getOrInsert(key: K, defaultValue: V): V {
    const entry = this.#entry(key);
    if (entry.isPresent()) {
      return entry.get() as V;
    }
    this.set(key, defaultValue);
    return defaultValue;
  }

  getOrInsertComputed(key: K, callback: (key: K) => V): V {
    const entry = this.#entry(key);
    if (entry.isPresent()) {
      return entry.get() as V;
    }
    const value = callback(key);
    this.set(key, value);
    return value;
  }

  has(key: K): boolean {
    return this.#entry(key).isPresent();
  }

  *#iterate(): IterableIterator<[K, Entry<V>]> {
    for (const [key, entry] of this.#entries) {
      if (entry.isPresent()) {
        yield [key, entry];
      }
    }
  }

  *keys(): MapIterator<K> {
    this.#keys.read();

    for (const [key] of this.#iterate()) {
      yield key;
    }
  }

  set(key: K, value: V): this {
    const entry = this.#entry(key);
    const disposition = entry.set(value);

    if (disposition === "initialized") {
      this.#keys.mark();
    }

    if (disposition === "initialized" || disposition === "updated") {
      this.#values.mark();
    }

    return this;
  }

  *values(): MapIterator<V> {
    // add an extra frame for the internal JS call to .next()

    this.#values.read();

    for (const [, value] of this.#iterate()) {
      yield value.get() as V;
    }
  }
}

export class ReactiveSet<T> implements Set<T> {
  readonly [Symbol.toStringTag] = "Set";

  readonly #description: Description | undefined;
  readonly #entries = new Map<T, Entry<T>>();
  readonly #equality: Equality<T>;
  readonly #values: Marker;

  static reactive<T>(
    equality: Equality<T>,
    description: Description | undefined,
  ): ReactiveSet<T> {
    return new ReactiveSet(description, equality);
  }

  private constructor(
    description: Description | undefined,
    equality: Equality<T>,
  ) {
    this.#description = description;
    this.#equality = equality;
    this.#values = Marker({ description: description?.key("values") });
  }

  get size(): number {
    this.#values.read();

    let size = 0;

    for (const _ of this.#iterate()) {
      size++;
    }

    return size;
  }

  /** @public */
  [Symbol.iterator](): SetIterator<T> {
    return this.keys();
  }

  add(value: T): this {
    const entry = this.#entry(value);

    if (!entry.isPresent()) {
      this.#entries.set(value, entry);
      this.#values.mark();
      entry.set(value);
    }

    return this;
  }

  clear(): void {
    if (this.#entries.size > EMPTY_MAP_SIZE) {
      this.#entries.clear();
      this.#values.mark();
    }
  }

  delete(value: T): boolean {
    const entry = this.#entries.get(value);

    if (entry) {
      const disposition = entry.delete();

      if (disposition === "deleted") {
        this.#values.mark();
        this.#entries.delete(value);
        return true;
      }
    }

    return false;
  }

  *entries(): SetIterator<[T, T]> {
    this.#values.read();

    for (const [value, entry] of this.#iterate()) {
      yield [value, entry.get() as T];
    }
  }

  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: unknown,
  ): void {
    this.#values.read();

    for (const [value] of this.#iterate()) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  has(value: T): boolean {
    return this.#entry(value).isPresent();
  }

  *#iterate(): IterableIterator<[T, Entry<T>]> {
    for (const [value, entry] of this.#entries) {
      if (entry.isPresent()) {
        yield [value, entry];
      }
    }
  }

  *keys(): SetIterator<T> {
    this.#values.read();

    for (const [value] of this.#iterate()) {
      yield value;
    }
  }

  values(): SetIterator<T> {
    return this.keys();
  }

  // ES2025 Set composition methods. These delegate to a plain `Set` built
  // from the current values; iterating `this` touches `#values`, so the
  // reactive dependency is recorded correctly.
  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return new Set<T>(this).union(other);
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    return new Set<T>(this).intersection(other);
  }

  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    return new Set<T>(this).difference(other);
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    return new Set<T>(this).symmetricDifference(other);
  }

  isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
    return new Set<T>(this).isSubsetOf(other);
  }

  isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
    return new Set<T>(this).isSupersetOf(other);
  }

  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
    return new Set<T>(this).isDisjointFrom(other);
  }

  #entry(value: T): Entry<T> {
    let entry = this.#entries.get(value);

    if (entry === undefined) {
      entry = Entry.uninitialized(this.#description, this.#equality);
      this.#entries.set(value, entry);
    }

    return entry;
  }
}
