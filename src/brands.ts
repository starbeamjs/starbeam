import type { Timestamp } from "./universe/timestamp";

export const IS_UPDATED_SINCE = Symbol("IS_UPDATED_SINCE");

export interface IsUpdatedSince {
  [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
}
