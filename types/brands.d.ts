import type { Timestamp } from "./universe/timestamp.js";
export declare const IS_UPDATED_SINCE: unique symbol;
export interface IsUpdatedSince {
    [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
}
