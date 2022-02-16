import type { Timestamp } from "../root/timestamp.js";
export declare const IS_UPDATED_SINCE1: unique symbol;
export declare type IS_UPDATED_SINCE1 = typeof IS_UPDATED_SINCE1;
export interface IsUpdatedSince {
    [IS_UPDATED_SINCE1](timestamp: Timestamp): boolean;
}
