/**
 * An IndexMap is a two-way map from A to Set<B> and B to Set<A>.
 */
export class IndexMap<K, V> {
  static create<A, B>(): IndexMap<A, B> {
    return new IndexMap<A, B>(new Map<A, Set<B>>(), new Map<B, Set<A>>());
  }

  readonly #byKey: Map<K, Set<V>>;
  readonly #byValue: Map<V, Set<K>>;

  private constructor(forward: Map<K, Set<V>>, backward: Map<V, Set<K>>) {
    this.#byKey = forward;
    this.#byValue = backward;
  }

  has(k: K, v: V): boolean {
    const set = this.#byKey.get(k);
    return set !== undefined && set.has(v);
  }

  findByKey(k: K): Set<V> | undefined {
    return this.#byKey.get(k);
  }

  findByValue(v: V): Set<K> | undefined {
    return this.#byValue.get(v);
  }

  delete(a: K, b: V): boolean {
    const set = this.#byKey.get(a);
    if (set === undefined) {
      return false;
    }

    const deleted = set.delete(b);
    if (set.size === 0) {
      this.#byKey.delete(a);
    }

    const set2 = this.#byValue.get(b);
    if (set2 === undefined) {
      return deleted;
    }

    const deleted2 = set2.delete(a);
    if (set2.size === 0) {
      this.#byValue.delete(b);
    }

    return deleted && deleted2;
  }

  hasKey(a: K): boolean {
    return this.#byKey.has(a);
  }

  hasValue(b: V): boolean {
    return this.#byValue.has(b);
  }

  add(a: K, b: V): void {
    const set = this.#byKey.get(a);
    if (set === undefined) {
      this.#byKey.set(a, new Set([b]));
    } else {
      set.add(b);
    }

    const set2 = this.#byValue.get(b);
    if (set2 === undefined) {
      this.#byValue.set(b, new Set([a]));
    } else {
      set2.add(a);
    }
  }
}
