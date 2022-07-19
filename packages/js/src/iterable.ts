import { type Equality, Cell, Marker } from "@starbeam/core";
import { UNINITIALIZED } from "@starbeam/core-utils";
import { type Description, callerStack } from "@starbeam/debug";

class Entry<V> {
  static initialized<V>(value: V, desc: Description, equality: Equality<V>) {
    return new Entry(
      Cell<UNINITIALIZED | V>(value, {
        description: desc,
        equals: equals(equality),
      }),
      Cell(true, {
        description: desc.implementation({ reason: "initialized" }),
      })
    );
  }

  static uninitialized<V>(desc: Description, equality: Equality<V>) {
    return new Entry(
      Cell<UNINITIALIZED | V>(UNINITIALIZED, {
        description: desc,
        equals: equals(equality),
      }),
      Cell(false, {
        description: desc.implementation({ reason: "initialized" }),
      })
    );
  }

  #initialized: Cell<boolean>;
  #value: Cell<V | UNINITIALIZED>;

  constructor(value: Cell<V | UNINITIALIZED>, initialized: Cell<boolean>) {
    this.#value = value;
    this.#initialized = initialized;
  }

  isPresent(): boolean {
    return this.#initialized.current;
  }

  delete(): "deleted" | "unchanged" {
    const cell = this.#value.current;

    if (cell === UNINITIALIZED) {
      return "unchanged";
    } else {
      this.#initialized.set(false);
      this.#value.set(UNINITIALIZED);
      return "deleted";
    }
  }

  get(): V | undefined {
    const current = this.#value.current;

    if (current === UNINITIALIZED) {
      return undefined;
    } else {
      return current;
    }
  }

  set(value: V): "initialized" | "updated" | "unchanged" {
    if (this.#value.current === UNINITIALIZED) {
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

export class ReactiveMap<K, V> implements Map<K, V> {
  static reactive<K, V>(
    equality: Equality<V>,
    description: Description
  ): ReactiveMap<K, V> {
    return new ReactiveMap(description, equality);
  }

  #description: Description;
  #entries: Map<K, Entry<V>> = new Map();
  #equality: Equality<V>;
  #keys: Marker;
  #values: Marker;

  private constructor(description: Description, equality: Equality<V>) {
    this.#description = description;
    this.#equality = equality;
    this.#keys = Marker(description.key("keys"));
    this.#values = Marker(description.key("values"));
  }

  clear(): void {
    if (this.#entries.size > 0) {
      this.#entries.clear();
      this.#keys.update();
      this.#values.update();
    }
  }

  delete(key: K): boolean {
    const entry = this.#entries.get(key);

    if (entry) {
      const disposition = entry.delete();

      if (disposition === "deleted") {
        this.#entries.delete(key);
        this.#keys.update();
        this.#values.update();
        return true;
      }
    }

    return false;
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: unknown
  ): void {
    this.#keys.consume(callerStack());
    this.#values.consume(callerStack());

    for (const [key, entry] of this.#entries) {
      callbackfn.call(thisArg, entry.get() as V, key, this);
    }
  }

  get(key: K): V | undefined {
    const entry = this.#entry(key);
    return entry?.get();
  }

  has(key: K): boolean {
    return this.#entry(key).isPresent();
  }

  set(key: K, value: V): this {
    const entry = this.#entry(key);
    const disposition = entry.set(value);

    if (disposition === "initialized") {
      this.#keys.update();
    }

    if (disposition === "initialized" || disposition === "updated") {
      this.#values.update();
    }

    return this;
  }

  get size(): number {
    this.#keys.consume(callerStack());

    let size = 0;

    for (const [, entry] of this.#iterate()) {
      if (entry.isPresent()) {
        size++;
      }
    }

    return size;
  }

  *#iterate(): IterableIterator<[K, Entry<V>]> {
    for (const [key, entry] of this.#entries) {
      if (entry.isPresent()) {
        yield [key, entry];
      }
    }
  }

  *entries(): IterableIterator<[K, V]> {
    this.#keys.consume(callerStack());
    this.#values.consume(callerStack());

    for (const [key, value] of this.#iterate()) {
      yield [key, value.get() as V];
    }
  }

  *keys(): IterableIterator<K> {
    this.#keys.consume(callerStack());

    for (const [key] of this.#iterate()) {
      yield key;
    }
  }

  *values(): IterableIterator<V> {
    // add an extra frame for the internal JS call to .next()
    this.#values.consume(callerStack(1));

    for (const [, value] of this.#iterate()) {
      yield value.get() as V;
    }
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  [Symbol.toStringTag] = "Map";

  #entry(key: K): Entry<V> {
    let entry = this.#entries.get(key);

    if (entry === undefined) {
      entry = Entry.uninitialized(
        this.#description.key(
          typeof key === "string" || typeof key === "number"
            ? String(key)
            : "entry"
        ),
        this.#equality
      );
      this.#entries.set(key, entry);
    }

    return entry;
  }
}

export class ReactiveSet<T> implements Set<T> {
  static reactive<T>(
    equality: Equality<T>,
    description: Description
  ): ReactiveSet<T> {
    return new ReactiveSet(description, equality);
  }

  #description: Description;
  #entries: Map<T, Entry<T>> = new Map();
  #equality: Equality<T>;
  #values: Marker;

  private constructor(description: Description, equality: Equality<T>) {
    this.#description = description;
    this.#equality = equality;
    this.#values = Marker(description.key("values"));
  }

  add(value: T): this {
    const entry = this.#entry(value);

    if (!entry.isPresent()) {
      this.#entries.set(value, entry);
      this.#values.update();
      entry.set(value);
    }

    return this;
  }

  clear(): void {
    if (this.#entries.size > 0) {
      this.#entries.clear();
      this.#values.update();
    }
  }

  delete(value: T): boolean {
    const entry = this.#entries.get(value);

    if (entry) {
      const disposition = entry.delete();

      if (disposition === "deleted") {
        this.#values.update();
        this.#entries.delete(value);
        return true;
      }
    }

    return false;
  }

  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: unknown
  ): void {
    this.#values.consume(callerStack());

    for (const [value] of this.#iterate()) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  has(value: T): boolean {
    return this.#entry(value).isPresent();
  }

  get size(): number {
    this.#values.consume(callerStack());

    let size = 0;

    for (const _ of this.#iterate()) {
      size++;
    }

    return size;
  }

  *#iterate(): IterableIterator<[T, Entry<T>]> {
    for (const [value, entry] of this.#entries) {
      if (entry.isPresent()) {
        yield [value, entry];
      }
    }
  }

  *entries(): IterableIterator<[T, T]> {
    this.#values.consume(callerStack());

    for (const [value, entry] of this.#iterate()) {
      yield [value, entry.get() as T];
    }
  }

  *keys(): IterableIterator<T> {
    this.#values.consume(callerStack());

    for (const [value] of this.#iterate()) {
      yield value;
    }
  }

  values(): IterableIterator<T> {
    return this.keys();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this.keys();
  }

  [Symbol.toStringTag] = "Set";

  #entry(value: T): Entry<T> {
    let entry = this.#entries.get(value);

    if (entry === undefined) {
      entry = Entry.uninitialized(this.#description, this.#equality);
      this.#entries.set(value, entry);
    }

    return entry;
  }
}
