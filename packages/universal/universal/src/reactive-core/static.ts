import type { Description } from "@starbeam/debug";
import { Desc } from "@starbeam/debug";
import type { Reactive } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { StaticTag } from "@starbeam/tags";

export function Static<T>(
  value: T,
  description?: string | Description
): Reactive<T> {
  return Object.freeze({
    [TAG]: StaticTag.create(Desc("static", description)),
    current: value,
    read: () => value,
  });
}
