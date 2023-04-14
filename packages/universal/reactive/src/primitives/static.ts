import type { StaticTag, TaggedReactive } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createStaticTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import type { PrimitiveOptions } from "./utils.js";

export type Static<T> = TaggedReactive<StaticTag, T>;

export function Static<T>(
  value: T,
  { description }: PrimitiveOptions = {}
): Static<T> {
  return {
    [TAG]: createStaticTag(RUNTIME.Desc?.("static", description)),
    read: () => value,
    current: value,
  };
}
