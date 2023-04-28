import type { CallStack, Description } from "@starbeam/interfaces";
import { type Equality, Marker, RUNTIME } from "@starbeam/reactive";

interface Entry {
  has: Marker;
  get: Marker;
}

interface MapState<K, V> {
  readonly description: Description | undefined;
  readonly iteration: Marker;
  readonly storage: WeakMap<K & object, Entry> | Map<K, Entry>;
  readonly vals: WeakMap<K & object, V> | Map<K, V>;
  readonly equals: Equality<V>;
}

class TrackedMapLike<K, V> {
  readonly #state: MapState<K, V>;

  constructor(state: MapState<K, V>) {
    this.#state = state;
  }

  #entry(key: K): Entry {
    let markers = this.#tryEntry(key);

    if (markers === undefined) {
      markers = {
        get: Marker(
          this.#state.description?.key(describeKey(key)).detail("cell", "get")
        ),
        has: Marker(
          this.#state.description?.key(describeKey(key)).detail("cell", "has")
        ),
      };
      this.#state.storage.set(key, markers);
    }

    return markers;
  }

  #tryEntry(key: K): Entry | undefined {
    return this.#state.storage.get(key);
  }

  #get(
    key: K,
    caller: CallStack | undefined,
    entry: Entry = this.#entry(key)
  ): V | undefined {
    entry.get.read(caller);
    return this.#state.vals.get(key);
  }

  #has(
    key: K,
    caller: CallStack | undefined,
    entry: Entry = this.#entry(key)
  ): boolean {
    entry.has.read(caller);
    return this.#state.vals.has(key);
  }

  has(key: K): boolean {
    return this.#has(key, RUNTIME.callerStack?.());
  }

  #insert(key: K, caller: CallStack | undefined): void {
    const entry = this.#tryEntry(key);
    if (entry) entry.has.mark(caller);

    this.#state.iteration.mark(caller);
  }

  #update(key: K, caller: CallStack | undefined): void {
    const entry = this.#tryEntry(key);
    if (entry) entry.get.mark(caller);

    this.#state.iteration.mark(caller);
  }
}

export class TrackedWeakMap<K extends object = object, V = unknown>
  implements WeakMap<K, V>
{
  static reactive<K extends object, V>(
    description: Description | undefined
  ): WeakMap<K, V> {
    return new TrackedWeakMap(description) as WeakMap<K, V>;
  }

  readonly #state: MapState<K, V>;
  // readonly #description: Description | undefined;
  // readonly #iteration: Marker;
  // readonly #storage: WeakMap<K, Entry>;
  // readonly #vals: WeakMap<K, V>;
  // readonly #equals: Equality<V> = Object.is;

  private constructor(description: Description | undefined) {
    this.#state = {
      description,
      vals: new WeakMap(),
      iteration: Marker(description?.detail("collection", "iterate")),
      storage: new WeakMap(),
      equals: Object.is,
    };
  }

  #entry(key: K): Entry {
    let markers = this.#tryEntry(key);

    if (markers === undefined) {
      markers = {
        get: Marker(
          this.#state.description?.key(describeKey(key)).detail("cell", "get")
        ),
        has: Marker(
          this.#state.description?.key(describeKey(key)).detail("cell", "has")
        ),
      };
      this.#state.storage.set(key, markers);
    }

    return markers;
  }

  #tryEntry(key: K): Entry | undefined {
    return this.#state.storage.get(key);
  }

  #get(
    key: K,
    caller: CallStack | undefined,
    entry: Entry = this.#entry(key)
  ): V | undefined {
    entry.get.read(caller);
    return this.#state.vals.get(key);
  }

  get(key: K): V | undefined {
    const caller = RUNTIME.callerStack?.();
    const entry = this.#entry(key);
    return this.#has(key, caller, entry)
      ? this.#get(key, caller, entry)
      : undefined;
  }

  #has(
    key: K,
    caller: CallStack | undefined,
    entry: Entry = this.#entry(key)
  ): boolean {
    entry.has.read(caller);
    return this.#state.vals.has(key);
  }

  has(key: K): boolean {
    return this.#has(key, RUNTIME.callerStack?.());
  }

  #insert(key: K, caller: CallStack | undefined): void {
    const entry = this.#tryEntry(key);
    if (entry) entry.has.mark(caller);

    this.#state.iteration.mark(caller);
  }

  #update(key: K, caller: CallStack | undefined): void {
    const entry = this.#tryEntry(key);
    if (entry) entry.get.mark(caller);

    this.#state.iteration.mark(caller);
  }

  set(key: K, value: V): this {
    const caller = RUNTIME.callerStack?.();

    // intentionally avoid consuming the `has` or `get` markers while setting.
    const has = this.#state.vals.has(key);

    if (has) {
      const current = this.#state.vals.get(key) as V;
      if (!this.#state.equals(current, value)) this.#update(key, caller);
    } else {
      this.#insert(key, caller);
    }

    this.#state.vals.set(key, value);

    return this;
  }

  #delete(key: K, caller: CallStack | undefined): void {
    const entry = this.#tryEntry(key);

    // if anyone checked the presence of this key before, invalidate the check.
    if (entry) entry.has.mark(caller);

    // either way, invalidate iteration of the map.
    this.#state.iteration.mark(caller);
  }

  delete(key: K): boolean {
    const caller = RUNTIME.callerStack?.();

    // if the key is not in the map, then deleting it has no reactive effect.
    if (this.#state.vals.has(key)) {
      this.#delete(key, caller);
    }

    return this.#state.vals.delete(key);
  }

  get [Symbol.toStringTag](): string {
    return this.#state.vals[Symbol.toStringTag];
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
