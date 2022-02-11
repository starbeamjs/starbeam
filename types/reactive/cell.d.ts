import { IS_UPDATED_SINCE } from "../brands.js";
import type { Timestamp } from "../root/timestamp.js";
import { AbstractReactive } from "./core.js";
import { ReactiveMetadata } from "./metadata.js";
export declare class Cell<T> extends AbstractReactive<T> {
    #private;
    static create<T>(value: T, description: string): Cell<T>;
    private constructor();
    get description(): string;
    get metadata(): ReactiveMetadata;
    freeze(): void;
    update(value: T): void;
    get current(): T;
    [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
}
export declare type AnyCell = Cell<unknown>;