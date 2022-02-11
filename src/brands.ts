import type { Timestamp } from "./root/timestamp.js";

export const IS_UPDATED_SINCE = Symbol("IS_UPDATED_SINCE");

export interface IsUpdatedSince {
  [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
}
