import type { Description, EntryPoint } from "@starbeam/interfaces";
import { UNINITIALIZED } from "@starbeam/shared";
import { Cell, DEBUG, type Equality, Marker } from "@starbeam/universal";

class Entry<V> {
  readonly #initialized: Cell<boolean>;
  readonly #value: Cell<V | UNINITIALIZED>;

  static initialized<V>(
    value: V,
    desc: Description | undefined,
    equality: Equality<V>
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
          "the entry was initialized"
        ),
      })
    );
  }

  static uninitialized<V>(
    desc: Description | undefined,
    equality: Equality<V>
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
          "the entry was initialized"
        ),
      })
    );
  }

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
  readonly [Symbol.toStringTag] = "Map";
  readonly #description: Description | undefined;
  readonly #entries = new Map<K, Entry<V>>();
  readonly #equality: Equality<V>;
  readonly #keys: Marker;
  readonly #values: Marker;

  static reactive<K, V>(
    equality: Equality<V>,
    description: Description | undefined
  ): ReactiveMap<K, V> {
    return new ReactiveMap(description, equality);
  }

  private constructor(
    description: Description | undefined,
    equality: Equality<V>
  ) {
    this.#description = description;
    this.#equality = equality;
    this.#keys = Marker({ description: description?.key("keys") });
    this.#values = Marker({ description: description?.key("values") });
  }

  get size(): number {
    const entryPoint = DEBUG?.markEntryPoint([
      "object:get",
      "ReactiveMap",
      "size",
    ]);
    this.#keys.read();

    let size = 0;

    for (const [, entry] of this.#iterate(entryPoint)) {
      if (entry.isPresent()) size++;
    }

    return size;
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  clear(): void {
    if (this.#entries.size > EMPTY_MAP_SIZE) {
      DEBUG?.markEntryPoint(["object:call", "ReactiveMap", "clear"]);

      this.#entries.clear();
      this.#keys.mark();
      this.#values.mark();
    }
  }

  delete(key: K): boolean {
    const entry = this.#entries.get(key);

    if (entry) {
      DEBUG?.markEntryPoint(["collection:delete", "ReactiveMap", key]);

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

  *entries(): IterableIterator<[K, V]> {
    const entryPoint = DEBUG?.markEntryPoint([
      "object:call",
      "ReactiveMap",
      "entries",
    ]);
    this.#keys.read();
    this.#values.read();

    for (const [key, value] of this.#iterate(entryPoint)) {
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
    DEBUG?.markEntryPoint(["object:call", "ReactiveMap", "forEach"]);
    this.#keys.read();
    this.#values.read();

    for (const [key, entry] of this.#entries) {
      callbackfn.call(thisArg, entry.get() as V, key, this);
    }
  }

  get(key: K): V | undefined {
    DEBUG?.markEntryPoint(["collection:get", "ReactiveMap", key]);
    const entry = this.#entry(key);
    return entry.get();
  }

  has(key: K): boolean {
    DEBUG?.markEntryPoint(["collection:has", "ReactiveMap", key]);
    return this.#entry(key).isPresent();
  }

  *#iterate(
    entryPoint: EntryPoint | undefined
  ): IterableIterator<[K, Entry<V>]> {
    for (const [key, entry] of this.#entries) {
      if (entry.isPresent()) {
        // restore the entry point since the iteration isn't necessarily
        // synchronous.
        DEBUG?.markEntryPoint(entryPoint);

        yield [key, entry];
      }
    }
  }

  *keys(): IterableIterator<K> {
    const entryPoint = DEBUG?.markEntryPoint([
      "object:call",
      "ReactiveMap",
      "keys",
    ]);
    this.#keys.read();

    for (const [key] of this.#iterate(entryPoint)) {
      DEBUG?.markEntryPoint(["object:call", "ReactiveMap", "keys"]);

      yield key;
    }
  }

  set(key: K, value: V): this {
    DEBUG?.markEntryPoint(["collection:insert", "ReactiveMap", key]);

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

  *values(): IterableIterator<V> {
    // TODO: previously we thought that we needed an extra frame for the
    // internal JS call to .next(). Is this true?
    const entryPoint = DEBUG?.markEntryPoint([
      "object:call",
      "ReactiveMap",
      "values",
    ]);

    this.#values.read();

    for (const [, value] of this.#iterate(entryPoint)) {
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
    description: Description | undefined
  ): ReactiveSet<T> {
    return new ReactiveSet(description, equality);
  }

  private constructor(
    description: Description | undefined,
    equality: Equality<T>
  ) {
    this.#description = description;
    this.#equality = equality;
    this.#values = Marker({ description: description?.key("values") });
  }

  get size(): number {
    const entryPoint = DEBUG?.markEntryPoint([
      "object:get",
      "ReactiveSet",
      "size",
    ]);

    this.#values.read();

    let size = 0;

    for (const _ of this.#iterate(entryPoint)) size++;

    return size;
  }

  [Symbol.iterator](): IterableIterator<T> {
    DEBUG?.markEntryPoint(["object:call", "ReactiveSet", Symbol.iterator]);
    return this.keys();
  }

  add(value: T): this {
    DEBUG?.markEntryPoint(["collection:insert", "ReactiveSet", value]);

    const entry = this.#entry(value);

    if (!entry.isPresent()) {
      this.#entries.set(value, entry);
      this.#values.mark();
      entry.set(value);
    }

    return this;
  }

  clear(): void {
    DEBUG?.markEntryPoint(["object:call", "ReactiveSet", "clear"]);

    if (this.#entries.size > EMPTY_MAP_SIZE) {
      this.#entries.clear();
      this.#values.mark();
    }
  }

  delete(value: T): boolean {
    DEBUG?.markEntryPoint(["collection:delete", "ReactiveSet", value]);

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

  *entries(): IterableIterator<[T, T]> {
    const entryPoint = DEBUG?.markEntryPoint([
      "object:call",
      "ReactiveSet",
      "entries",
    ]);

    this.#values.read();

    for (const [value, entry] of this.#iterate(entryPoint)) {
      yield [value, entry.get() as T];
    }
  }

  forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: unknown
  ): void {
    const entryPoint = DEBUG?.markEntryPoint([
      "object:call",
      "ReactiveSet",
      "forEach",
    ]);

    this.#values.read();

    for (const [value] of this.#iterate(entryPoint)) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  has(value: T): boolean {
    DEBUG?.markEntryPoint(["collection:has", "ReactiveSet", value]);

    return this.#entry(value).isPresent();
  }

  *#iterate(
    entryPoint: EntryPoint | undefined
  ): IterableIterator<[T, Entry<T>]> {
    for (const [value, entry] of this.#entries) {
      if (entry.isPresent()) {
        // restore the entry point since the iteration isn't necessarily
        // synchronous.
        DEBUG?.markEntryPoint(entryPoint);
        yield [value, entry];
      }
    }
  }

  *keys(): IterableIterator<T> {
    const entryPoint = DEBUG?.markEntryPoint([
      "object:call",
      "ReactiveSet",
      "keys",
    ]);

    this.#values.read();

    for (const [value] of this.#iterate(entryPoint)) {
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
