import type { Stack } from "@starbeam/debug";
import { callerStack, type Description } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/shared";
import { Cell, type Equality, Marker } from "@starbeam/universal";

class Entry<V> {
  readonly #initialized: Cell<boolean>;
  readonly #value: Cell<V | UNINITIALIZED>;

  static initialized<V>(
    value: V,
    desc: Description,
    equality: Equality<V>
  ): Entry<V> {
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

  static uninitialized<V>(desc: Description, equality: Equality<V>): Entry<V> {
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

  constructor(value: Cell<V | UNINITIALIZED>, initialized: Cell<boolean>) {
    this.#value = value;
    this.#initialized = initialized;
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

  isPresent(caller: Stack): boolean {
    return this.#initialized.read(caller);
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

const EMPTY_MAP_SIZE = 0;
const EXTRA_CALLER_FRAME = 1;

export class ReactiveMap<K, V> implements Map<K, V> {
  readonly [Symbol.toStringTag] = "Map";
  readonly #description: Description;
  readonly #entries = new Map<K, Entry<V>>();
  readonly #equality: Equality<V>;
  readonly #keys: Marker;
  readonly #values: Marker;

  static reactive<K, V>(
    equality: Equality<V>,
    description: Description
  ): ReactiveMap<K, V> {
    return new ReactiveMap(description, equality);
  }

  private constructor(description: Description, equality: Equality<V>) {
    this.#description = description;
    this.#equality = equality;
    this.#keys = Marker(description.key("keys"));
    this.#values = Marker(description.key("values"));
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

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  clear(): void {
    const caller = callerStack();
    if (this.#entries.size > EMPTY_MAP_SIZE) {
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

  *entries(): IterableIterator<[K, V]> {
    const caller = callerStack();
    this.#keys.consume(caller);
    this.#values.consume(caller);

    for (const [key, value] of this.#iterate(caller)) {
      yield [key, value.get(caller) as V];
    }
  }

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
    return entry.get(caller);
  }

  has(key: K): boolean {
    const caller = callerStack();
    return this.#entry(key).isPresent(caller);
  }

  *#iterate(caller: Stack): IterableIterator<[K, Entry<V>]> {
    for (const [key, entry] of this.#entries) {
      if (entry.isPresent(caller)) {
        yield [key, entry];
      }
    }
  }

  *keys(): IterableIterator<K> {
    const caller = callerStack();
    this.#keys.consume(caller);

    for (const [key] of this.#iterate(caller)) {
      yield key;
    }
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

  *values(): IterableIterator<V> {
    // add an extra frame for the internal JS call to .next()
    const caller = callerStack(EXTRA_CALLER_FRAME);

    this.#values.consume(caller);

    for (const [, value] of this.#iterate(caller)) {
      yield value.get(caller) as V;
    }
  }
}

export class ReactiveSet<T> implements Set<T> {
  readonly [Symbol.toStringTag] = "Set";

  readonly #description: Description;
  readonly #entries = new Map<T, Entry<T>>();
  readonly #equality: Equality<T>;
  readonly #values: Marker;

  static reactive<T>(
    equality: Equality<T>,
    description: Description
  ): ReactiveSet<T> {
    return new ReactiveSet(description, equality);
  }

  private constructor(description: Description, equality: Equality<T>) {
    this.#description = description;
    this.#equality = equality;
    this.#values = Marker(description.key("values"));
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

  [Symbol.iterator](): IterableIterator<T> {
    return this.keys();
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

    if (this.#entries.size > EMPTY_MAP_SIZE) {
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

  *entries(): IterableIterator<[T, T]> {
    const caller = callerStack();

    this.#values.consume(caller);

    for (const [value, entry] of this.#iterate(caller)) {
      yield [value, entry.get(caller) as T];
    }
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

  *#iterate(caller: Stack): IterableIterator<[T, Entry<T>]> {
    for (const [value, entry] of this.#entries) {
      if (entry.isPresent(caller)) {
        yield [value, entry];
      }
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

  #entry(value: T): Entry<T> {
    let entry = this.#entries.get(value);

    if (entry === undefined) {
      entry = Entry.uninitialized(this.#description, this.#equality);
      this.#entries.set(value, entry);
    }

    return entry;
  }
}
