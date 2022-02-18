export declare class OrderedIndex<K, V> {
    readonly map: ReadonlyMap<K, V>;
    readonly list: readonly V[];
    readonly key: (value: V) => K;
    static create<K, V>(list: readonly V[], key: (value: V) => K): OrderedIndex<K, V>;
    static empty<K, V>(key: (value: V) => K): OrderedIndex<K, V>;
    constructor(map: ReadonlyMap<K, V>, list: readonly V[], key: (value: V) => K);
    [Symbol.iterator](): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;
    get keys(): readonly K[];
    has(key: K): boolean;
    get(key: K): V | null;
    mergedMap(other: OrderedIndex<K, V>): Map<K, V>;
}
