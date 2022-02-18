import { HasMetadata } from "../metadata.js";
import type * as types from "../../fundamental/types.js";
import type { IsUpdatedSince, Timestamp } from "./timestamp.js";
import { IS_UPDATED_SINCE } from "../../fundamental/constants.js";
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
    add(cell: types.Cell | FinalizedFrame): void;
    finalize<T>(value: T, now: Timestamp): {
        frame: FinalizedFrame<T>;
        initial: T;
    };
}
export declare class FinalizedFrame<T = unknown> extends HasMetadata implements IsUpdatedSince {
    #private;
    readonly description?: string | undefined;
    constructor(children: Set<types.Cell | FinalizedFrame>, finalizedAt: Timestamp, value: T, description?: string | undefined);
    get metadata(): types.ReactiveMetadata;
    get cells(): readonly types.Cell<unknown>[];
    [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
    validate(): {
        status: "valid";
        value: T;
    } | {
        status: "invalid";
    };
}
