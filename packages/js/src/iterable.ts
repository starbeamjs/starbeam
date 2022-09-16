import { type Equality, Cell, Marker } from "@starbeam/core";
import { UNINITIALIZED } from "@starbeam/core-utils";
import type { Stack } from "@starbeam/debug";
import { type Description, callerStack } from "@starbeam/debug";

class Entry<V> {
  static initialized<V>(value: V, desc: Description, equality: Equality<V>) {
    return new Entry(
      Cell<UNINITIALIZED | V>(value, {
        description: desc,
        equals: equals(equality),
      }),
      Cell(true, {
        description: desc.implementation("initialized", {
          reason: "initialized",
        }),
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
        description: desc.implementation("initialized", {
          reason: "initialized",
        }),
      })
    );
  }

  #initialized: Cell<boolean>;
  #value: Cell<V | UNINITIALIZED>;

  constructor(value: Cell<V | UNINITIALIZED>, initialized: Cell<boolean>) {
    this.#value = value;
    this.#initialized = initialized;
  }

  isPresent(caller: Stack): boolean {
    return this.#initialized.read(caller);
  }

  delete(caller: Stack): "deleted" | "unchanged" {
    const cell = this.#value.read(caller);

    if (cell === UNINITIALIZED) {
      return "unchanged";
    } else {
      this.#initialized.set(false, caller);
      this.#value.set(UNINITIALIZED, caller);
      return "deleted";
    }
  }

  get(caller: Stack): V | undefined {
    const current = this.#value.read(caller);

    if (current === UNINITIALIZED) {
      return undefined;
    } else {
      return current;
    }
  }

  set(value: V, caller: Stack): "initialized" | "updated" | "unchanged" {
    if (this.#value.read(caller) === UNINITIALIZED) {
      this.#value.set(value, caller);
      this.#initialized.set(true, caller);
      return "initialized";
    } else {
      return this.#value.set(value, caller) ? "updated" : "unchanged";
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
    const caller = callerStack();
    if (this.#entries.size > 0) {
      this.#entries.clear();
      this.#keys.update(caller);
      this.#values.update(caller);
    }
  }

  delete(key: K): boolean {
    const caller = callerStack();
    const entry = this.#entries.get(key);

    if (entry) {
      const disposition = entry.delete(caller);

      if (disposition === "deleted") {
        this.#entries.delete(key);
        this.#keys.update(caller);
        this.#values.update(caller);
        return true;
      }
    }

    return false;
  }

  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: unknown
  ): void {
    const caller = callerStack();
    this.#keys.consume(caller);
    this.#values.consume(caller);

    for (const [key, entry] of this.#entries) {
      callbackfn.call(thisArg, entry.get(caller) as V, key, this);
    }
  }

  get(key: K): V | undefined {
    const caller = callerStack();
    const entry = this.#entry(key);
    return entry?.get(caller);
  }

  has(key: K): boolean {
    const caller = callerStack();
    return this.#entry(key).isPresent(caller);
  }

  set(key: K, value: V): this {
    const caller = callerStack();

    const entry = this.#entry(key);
    const disposition = entry.set(value, caller);

    if (disposition === "initialized") {
      this.#keys.update(caller);
    }

    if (disposition === "initialized" || disposition === "updated") {
      this.#values.update(caller);
    }

    return this;
  }

  get size(): number {
    const caller = callerStack();
    this.#keys.consume(caller);

    let size = 0;

    for (const [, entry] of this.#iterate(caller)) {
      if (entry.isPresent(caller)) {
        size++;
      }
    }

    return size;
  }

  *#iterate(caller: Stack): IterableIterator<[K, Entry<V>]> {
    for (const [key, entry] of this.#entries) {
      if (entry.isPresent(caller)) {
        yield [key, entry];
      }
    }
  }

  *entries(): IterableIterator<[K, V]> {
    const caller = callerStack();
    this.#keys.consume(caller);
    this.#values.consume(caller);

    for (const [key, value] of this.#iterate(caller)) {
      yield [key, value.get(caller) as V];
    }
  }

  *keys(): IterableIterator<K> {
    const caller = callerStack();
    this.#keys.consume(caller);

    for (const [key] of this.#iterate(caller)) {
      yield key;
    }
  }

  *values(): IterableIterator<V> {
    // add an extra frame for the internal JS call to .next()
    const caller = callerStack(1);

    this.#values.consume(caller);

    for (const [, value] of this.#iterate(caller)) {
      yield value.get(caller) as V;
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
    const caller = callerStack();

    const entry = this.#entry(value);

    if (!entry.isPresent(caller)) {
      this.#entries.set(value, entry);
      this.#values.update(caller);
      entry.set(value, caller);
    }

    return this;
  }

  clear(): void {
    const caller = callerStack();

    if (this.#entries.size > 0) {
      this.#entries.clear();
      this.#values.update(caller);
    }
  }

  delete(value: T): boolean {
    const caller = callerStack();

    const entry = this.#entries.get(value);

    if (entry) {
      const disposition = entry.delete(caller);

      if (disposition === "deleted") {
        this.#values.update(caller);
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
    const caller = callerStack();

    this.#values.consume(caller);

    for (const [value] of this.#iterate(caller)) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  has(value: T): boolean {
    const caller = callerStack();

    return this.#entry(value).isPresent(caller);
  }

  get size(): number {
    const caller = callerStack();

    this.#values.consume(caller);

    let size = 0;

    for (const _ of this.#iterate(caller)) {
      size++;
    }

    return size;
  }

  *#iterate(caller: Stack): IterableIterator<[T, Entry<T>]> {
    for (const [value, entry] of this.#entries) {
      if (entry.isPresent(caller)) {
        yield [value, entry];
      }
    }
  }

  *entries(): IterableIterator<[T, T]> {
    const caller = callerStack();

    this.#values.consume(caller);

    for (const [value, entry] of this.#iterate(caller)) {
      yield [value, entry.get(caller) as T];
    }
  }

  *keys(): IterableIterator<T> {
    const caller = callerStack();

    this.#values.consume(caller);

    for (const [value] of this.#iterate(caller)) {
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
