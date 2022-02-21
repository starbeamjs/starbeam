import { Cell } from "@starbeam/core";
/**
 * The purpose of this class is to present the `Cell` interface in an object
 * that changes its referential equality whenever the internal value changes.
 *
 * It's a bridge between Starbeam's timestamp-based world and React's
 * equality-based world.
 */
declare class UnstableCell<T> {
    #private;
    static create<T>(value: T, cell: Cell<T>): UnstableCell<T>;
    static next<T>(prev: UnstableCell<T>, next: T): UnstableCell<T>;
    private constructor();
    get current(): T;
    update(value: T): void;
}
declare type Atom<T> = UnstableCell<T>;
export declare function useAtom<T>(value: T): Atom<T>;
export {};
//# sourceMappingURL=atom.d.ts.map