import { Cell } from "../reactive/cell.js";
import type { Timeline } from "../universe/timeline.js";
declare class Cells {
    #private;
    set(object: object, key: PropertyKey, cell: Cell<unknown>): void;
    get(object: object, key: PropertyKey): Cell<unknown> | null;
}
export declare const CELLS: Cells;
export declare function scopedReactive(timeline: Timeline): PropertyDecorator;
export declare function scopedCached(timeline: Timeline): PropertyDecorator;
export {};
