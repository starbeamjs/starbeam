import type { AbstractReactive } from "../core.js";
import { HasMetadata, ReactiveMetadata } from "../metadata.js";
export declare class ReactiveMemo<T> extends HasMetadata implements AbstractReactive<T> {
    #private;
    static create<T>(callback: () => T, description: string): ReactiveMemo<T>;
    private constructor();
    get description(): string;
    get metadata(): ReactiveMetadata;
    get current(): T;
}
