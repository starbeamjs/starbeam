import type { Cell } from "../reactive/cell.js";
import { AnyFinalizedFrame, FinalizedFrame } from "./frames.js";
import { Timestamp } from "./timestamp.js";
export declare class Timeline {
    #private;
    static create(): Timeline;
    on: {
        readonly advance: (callback: () => void) => (() => void);
    };
    get now(): Timestamp;
    bump(): Timestamp;
    didConsume(cell: Cell | AnyFinalizedFrame): void;
    withAssertFrame(callback: () => void, description: string): void;
    withFrame<T>(callback: () => T, description: string): {
        frame: FinalizedFrame<T>;
        initial: T;
    };
}
export declare const TIMELINE: Timeline;
