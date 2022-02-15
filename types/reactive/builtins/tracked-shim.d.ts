import { ReactiveCell } from "../cell.js";
export declare type TrackedStorage<T> = ReactiveCell<T>;
export declare function createStorage<T>(value: T, callback: () => void, description?: string): ReactiveCell<T>;
export declare function getValue<T>(storage: ReactiveCell<T>): T;
export declare function setValue<T>(storage: ReactiveCell<T>, value: T): void;
