declare const INTERNAL: unique symbol;
declare type INTERNAL = typeof INTERNAL;
export declare class TrackedMap<K = unknown, V = unknown> implements Map<K, V> {
    #private;
    static reactive<M extends Map<unknown, unknown>>(map: M): M;
    constructor();
    constructor(internal: INTERNAL, map: Map<K, V>);
    constructor(entries: readonly (readonly [K, V])[] | null);
    constructor(iterable: Iterable<readonly [K, V]>);
    get(key: K): V | undefined;
    has(key: K): boolean;
    entries(): IterableIterator<[K, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    forEach(fn: (value: V, key: K, map: Map<K, V>) => void): void;
    get size(): number;
    [Symbol.iterator](): IterableIterator<[K, V]>;
    get [Symbol.toStringTag](): string;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    clear(): void;
}
export declare class TrackedWeakMap<K extends object = object, V = unknown> implements WeakMap<K, V> {
    #private;
    constructor();
    constructor(iterable: Iterable<readonly [K, V]>);
    constructor(entries: readonly [K, V][] | null);
    get(key: K): V | undefined;
    has(key: K): boolean;
    set(key: K, value: V): this;
    delete(key: K): boolean;
    get [Symbol.toStringTag](): string;
}
export {};
//# sourceMappingURL=map.d.ts.map