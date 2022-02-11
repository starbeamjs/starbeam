import { IS_UPDATED_SINCE } from "../brands.js";
import type { AnyCell } from "../reactive/cell.js";
import { HasMetadata, ReactiveMetadata } from "../reactive/metadata.js";
import type { Timestamp } from "./timestamp.js";
export declare class AssertFrame {
    #private;
    static describing(description: string): AssertFrame;
    private constructor();
    assert(): void;
}
export declare class ActiveFrame {
    #private;
    readonly description: string;
    static create(description: string): ActiveFrame;
    private constructor();
    add(cell: AnyCell | AnyFinalizedFrame): void;
    finalize<T>(value: T, now: Timestamp): {
        frame: FinalizedFrame<T>;
        initial: T;
    };
}
export declare class FinalizedFrame<T> extends HasMetadata {
    #private;
    readonly description?: string | undefined;
    constructor(children: Set<AnyCell | AnyFinalizedFrame>, finalizedAt: Timestamp, value: T, description?: string | undefined);
    get metadata(): ReactiveMetadata;
    [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
    validate(): {
        status: "valid";
        value: T;
    } | {
        status: "invalid";
    };
}
export declare type AnyFinalizedFrame = FinalizedFrame<unknown>;
