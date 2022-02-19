import { ExtendsReactive } from "./base.js";
import { ReactiveMetadata } from "../core/metadata.js";
import { UNINITIALIZED } from "../fundamental/constants.js";
import type { Cell } from "../fundamental/types.js";
export declare class ReactiveMemo<T> extends ExtendsReactive<T> {
    #private;
    static create<T>(callback: () => T, description: string): ReactiveMemo<T>;
    private constructor();
    get description(): string;
    get metadata(): ReactiveMetadata;
    get cells(): UNINITIALIZED | readonly Cell[];
    get current(): T;
}
