import { ReactiveMetadata } from "../core/metadata.js";
import type { Timestamp } from "../core/timeline/timestamp.js";
import { IS_UPDATED_SINCE } from "../fundamental/constants.js";
import type { Cell as CellType } from "../fundamental/types.js";
import { ExtendsReactive } from "./base.js";
export declare class ReactiveCell<T> extends ExtendsReactive<T> implements CellType {
    #private;
    static create<T>(value: T, description: string): ReactiveCell<T>;
    private constructor();
    get description(): string;
    get metadata(): ReactiveMetadata;
    get cells(): [Cell];
    freeze(): void;
    update(value: T): void;
    get current(): T;
    toString(): string;
    [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
}
export declare type Cell<T = unknown> = CellType<T>;
export declare function Cell<T>(value: T, description?: string): Cell<T>;
export declare namespace Cell {
    var is: <T>(value: unknown) => value is Cell<T>;
}
//# sourceMappingURL=cell.d.ts.map