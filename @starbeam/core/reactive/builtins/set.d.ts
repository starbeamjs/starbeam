export declare class TrackedSet<T = unknown> implements Set<T> {
    #private;
    constructor();
    constructor(values: readonly T[] | null);
    constructor(iterable: Iterable<T>);
    has(value: T): boolean;
    entries(): IterableIterator<[T, T]>;
    keys(): IterableIterator<T>;
    values(): IterableIterator<T>;
    forEach(fn: (value1: T, value2: T, set: Set<T>) => void): void;
    get size(): number;
    [Symbol.iterator](): IterableIterator<T>;
    get [Symbol.toStringTag](): string;
    add(value: T): this;
    delete(value: T): boolean;
    clear(): void;
}
export declare class TrackedWeakSet<T extends object = object> implements WeakSet<T> {
    #private;
    constructor(values?: readonly T[] | null);
    has(value: T): boolean;
    add(value: T): this;
    delete(value: T): boolean;
    get [Symbol.toStringTag](): string;
}
//# sourceMappingURL=set.d.ts.map