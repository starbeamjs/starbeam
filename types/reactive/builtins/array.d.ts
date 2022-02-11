declare class TrackedArray<T = unknown> {
    #private;
    /**
     * Creates an array from an iterable object.
     * @param iterable An iterable object to convert to an array.
     */
    static from<T>(iterable: Iterable<T> | ArrayLike<T>): TrackedArray<T>;
    /**
     * Creates an array from an iterable object.
     * @param iterable An iterable object to convert to an array.
     * @param mapfn A mapping function to call on every element of the array.
     * @param thisArg Value of 'this' used to invoke the mapfn.
     */
    static from<T, U>(iterable: Iterable<T> | ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: unknown): TrackedArray<U>;
    static of<T>(...arr: T[]): TrackedArray<T>;
    constructor(arr?: T[]);
}
interface TrackedArray<T = unknown> extends Array<T> {
}
export default TrackedArray;
