import type { Timestamp } from "../core/timeline/timestamp.js";
import { ExtendsReactive } from "./base.js";
import { ReactiveMetadata } from "../core/metadata.js";
import type * as types from "../fundamental/types.js";
import { IS_UPDATED_SINCE } from "../fundamental/constants.js";
export declare class ReactiveCell<T> extends ExtendsReactive<T> implements types.Cell {
    #private;
    static create<T>(value: T, description: string): ReactiveCell<T>;
    private constructor();
    get description(): string;
    get metadata(): ReactiveMetadata;
    freeze(): void;
    update(value: T): void;
    get current(): T;
    [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
}
export declare type Cell<T = unknown> = types.Cell<T>;
export declare function Cell<T>(value: T, description?: string): Cell<T>;
