export class OrderedIndex<K, V> {
  static create<K, V>(
    list: readonly V[],
    key: (value: V) => K
  ): OrderedIndex<K, V> {
    let map: Map<K, V> = new Map();

    for (let item of list) {
      map.set(key(item), item);
    }

    return new OrderedIndex(map, list, key);
  }

  static empty<K, V>(key: (value: V) => K): OrderedIndex<K, V> {
    return OrderedIndex.create([], key);
  }

  constructor(
    readonly map: ReadonlyMap<K, V>,
    readonly list: readonly V[],
    readonly key: (value: V) => K
  ) {}

  [Symbol.iterator](): IterableIterator<V> {
    return this.list[Symbol.iterator]();
  }

  *entries(): IterableIterator<[K, V]> {
    for (let item of this.list) {
      let key = this.key(item);
      yield [key, item];
    }
  }

  get keys(): readonly K[] {
    return this.list.map(this.key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  get(key: K): V | null {
    return this.map.get(key) ?? null;
  }

  mergedMap(other: OrderedIndex<K, V>): Map<K, V> {
    let key = this.key;

    let mergedList = [...mergeUniqueLists(this.list, other.list)];

    return new Map(mergedList.map((item) => [key(item), item]));
  }
}

function mergeUniqueLists<T>(a: readonly T[], b: readonly T[]): Iterable<T> {
  return new Set([...a, ...b]);
}

// class PresentOrderedIndex<K, V> extends OrderedIndex<K, V> {
//   static build<K, V>(key: (value: V) => K): PresentOrderedIndex<K, V> {
//     return PresentOrderedIndex.of([], key) as PresentOrderedIndex<K, V>;
//   }

//   static of<K, V>(list: V[], key: (value: V) => K): OrderedIndex<K, V> {
//     let map: Map<K, V> = new Map();

//     for (let item of list) {
//       map.set(key(item), item);
//     }

//     return new PresentOrderedIndex(map, list, key);
//   }

//   private constructor(
//     readonly map: Map<K, V>,
//     readonly list: V[],
//     key: (value: V) => K
//   ) {
//     super(key);
//   }
// }
