import type { AnyCell } from "../reactive/cell.js";
import { AnyFinalizedFrame, FinalizedFrame } from "./frames.js";
import { Timestamp } from "./timestamp.js";
export declare class Timeline {
    #private;
    static create(): Timeline;
    get now(): Timestamp;
    bump(): Timestamp;
    didConsume(cell: AnyCell | AnyFinalizedFrame): void;
    withAssertFrame(callback: () => void, description: string): void;
    withFrame<T>(callback: () => T, description: string): {
        frame: FinalizedFrame<T>;
        initial: T;
    };
}
export declare const TIMELINE: Timeline;
