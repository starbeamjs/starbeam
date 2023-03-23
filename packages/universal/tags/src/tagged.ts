import type { Tag, Tagged } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

export function getTag<T extends Tag>(tagged: Tagged<T>): T {
  return tagged[TAG];
}
