import type { Description } from "@starbeam/interfaces";
import { DEBUG, type Equality, Marker } from "@starbeam/universal";

interface Entry {
  has: Marker;
  get: Marker;
}

export class TrackedWeakMap<K extends object = object, V = unknown>
  implements WeakMap<K, V>
{
  static reactive<K extends object, V>(
    description: Description | undefined
  ): WeakMap<K, V> {
    return new TrackedWeakMap(description) as WeakMap<K, V>;
  }

  readonly #description: Description | undefined;
  readonly #iteration: Marker;
  readonly #storage: WeakMap<K, Entry>;
  readonly #vals: WeakMap<K, V>;
  readonly #equals: Equality<V> = Object.is;

  private constructor(description: Description | undefined) {
    this.#vals = new WeakMap();

    this.#iteration = Marker(description?.detail("collection", "iterate"));
    this.#storage = new WeakMap();

    this.#description = description;
  }

  #entry(key: K): Entry {
    let markers = this.#tryEntry(key);

    if (markers === undefined) {
      markers = {
        get: Marker(
          this.#description?.key(describeKey(key)).detail("cell", "get")
        ),
        has: Marker(
          this.#description?.key(describeKey(key)).detail("cell", "has")
        ),
      };
      this.#storage.set(key, markers);
    }

    return markers;
  }

  #tryEntry(key: K): Entry | undefined {
    return this.#storage.get(key);
  }

  #get(key: K, entry: Entry = this.#entry(key)): V | undefined {
    entry.get.read();
    return this.#vals.get(key);
  }

  get(key: K): V | undefined {
    DEBUG?.markEntryPoint(["collection:get", "TrackedWeakMap", key]);
    const entry = this.#entry(key);
    return this.#has(key, entry) ? this.#get(key, entry) : undefined;
  }

  #has(key: K, entry: Entry = this.#entry(key)): boolean {
    entry.has.read();
    return this.#vals.has(key);
  }

  has(key: K): boolean {
    DEBUG?.markEntryPoint(["collection:has", "TrackedWeakMap", key]);
    return this.#has(key);
  }

  #insert(key: K): void {
    const entry = this.#tryEntry(key);
    if (entry) entry.has.mark();

    this.#iteration.mark();
  }

  #update(key: K): void {
    const entry = this.#tryEntry(key);
    if (entry) entry.get.mark();

    this.#iteration.mark();
  }

  set(key: K, value: V): this {
    DEBUG?.markEntryPoint(["collection:insert", "TrackedWeakMap", key]);

    // intentionally avoid consuming the `has` or `get` markers while setting.
    const shouldInsert = !this.#vals.has(key);

    if (shouldInsert) {
      this.#insert(key);
    } else {
      const current = this.#vals.get(key) as V;
      if (!this.#equals(current, value)) this.#update(key);
    }

    this.#vals.set(key, value);

    return this;
  }

  #delete(key: K): void {
    const entry = this.#tryEntry(key);

    // if anyone checked the presence of this key before, invalidate the check.
    if (entry) entry.has.mark();

    // either way, invalidate iteration of the map.
    this.#iteration.mark();
  }

  delete(key: K): boolean {
    DEBUG?.markEntryPoint(["collection:delete", "TrackedWeakMap", key]);

    // if the key is not in the map, then deleting it has no reactive effect.
    if (this.#vals.has(key)) this.#delete(key);

    return this.#vals.delete(key);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakMap.prototype, WeakMap.prototype);

function describeKey(key: unknown): string {
  switch (typeof key) {
    case "object":
      return key === null ? "null" : "{key} ";
    case "function":
      return "{function} ";
    case "undefined":
    case "bigint":
    case "symbol":
    case "string":
    case "number":
    case "boolean":
      return String(key);
    default:
      throw Error(`UNEXPECTED: typeof value=${typeof key}`);
  }
}
