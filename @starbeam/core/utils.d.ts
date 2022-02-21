export declare type FIXME<_S extends string = string> = any;
export declare const INSPECT: unique symbol;
export declare function isObject<T>(value: T): value is T & object;
export declare function enumerate<T>(iterable: Iterable<T>): Iterable<[number, T]>;
export declare type PresentPosition = "first" | "last" | "middle" | "only";
export declare type EmptyPosition = "empty";
export declare const Position: {
    hasNext(position: PresentPosition): boolean;
    hasPrev(position: PresentPosition): boolean;
};
export declare function positioned<T>(iterable: Iterable<T>): IterableIterator<[T, PresentPosition]> & Iterator<[T, PresentPosition], {
    isEmpty: boolean;
}>;
export declare class NonemptyList<T> {
    #private;
    static of<T>(list: [T, ...(readonly T[])]): NonemptyList<T>;
    static verified<T>(list: readonly T[]): NonemptyList<T>;
    private constructor();
    [Symbol.iterator](): IterableIterator<T>;
    asArray(): readonly T[];
    pushing(...content: readonly T[]): NonemptyList<T>;
    takeBack(): [readonly T[], T];
    takeFront(): [T, readonly T[]];
    reversed(): IterableIterator<T>;
    get first(): T;
    get last(): T;
}
export declare function tap<T>(value: T, updates: (value: T) => void): T;
export declare class Pipe<T> {
    readonly value: T;
    static of<T>(value: T): Pipe<T>;
    private constructor();
    to<U>(pipe: (input: T) => U): Pipe<U>;
}
export declare function pipe<T>(value: T): Pipe<T>;
export declare function getDescription(fn: (...args: any[]) => unknown): string;
//# sourceMappingURL=utils.d.ts.map