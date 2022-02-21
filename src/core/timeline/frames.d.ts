import { HasMetadata } from "../metadata.js";
import type { Cell as CellType, ReactiveMetadata as ReactiveMetadataType } from "../../fundamental/types.js";
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
    add(cell: CellType | FinalizedFrame): void;
    finalize<T>(value: T, now: Timestamp): {
        frame: FinalizedFrame<T>;
        initial: T;
    };
}
export declare class FinalizedFrame<T = unknown> extends HasMetadata implements IsUpdatedSince {
    #private;
    readonly description?: string | undefined;
    constructor(children: Set<CellType | FinalizedFrame>, finalizedAt: Timestamp, value: T, description?: string | undefined);
    get metadata(): ReactiveMetadataType;
    get cells(): readonly CellType<unknown>[];
    [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
    validate(): {
        status: "valid";
        value: T;
    } | {
        status: "invalid";
    };
}
//# sourceMappingURL=frames.d.ts.map