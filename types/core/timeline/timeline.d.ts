import { Timestamp } from "./timestamp.js";
import { type FinalizedFrame } from "./frames.js";
import type { Cell } from "../../fundamental/types.js";
export declare class Timeline {
    #private;
    static create(): Timeline;
    private constructor();
    on: {
        readonly advance: (callback: () => void) => (() => void);
        readonly update: (cell: Cell<unknown>, callback: () => void) => (() => void);
    };
    get now(): Timestamp;
    bump(cell: Cell): Timestamp;
    didConsume(cell: Cell | FinalizedFrame): void;
    withAssertFrame(callback: () => void, description: string): void;
    withFrame<T>(callback: () => T, description: string): {
        frame: FinalizedFrame<T>;
        initial: T;
    };
}
export declare const TIMELINE: Timeline;
