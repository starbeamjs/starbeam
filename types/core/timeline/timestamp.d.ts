import type { IS_UPDATED_SINCE } from "../../fundamental/constants.js";
export interface IsUpdatedSince {
    [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
}
export declare class Timestamp {
    #private;
    static initial(): Timestamp;
    constructor(timestamp: number);
    gt(other: Timestamp): boolean;
    next(): Timestamp;
    toString(): string;
}
