import { Cell } from "../cell.js";
export declare type TrackedStorage<T> = Cell<T>;
export declare function createStorage<T>(value: T, callback: () => void, description?: string): Cell<T>;
export declare function getValue<T>(storage: Cell<T>): T;
export declare function setValue<T>(storage: Cell<T>, value: T): void;
