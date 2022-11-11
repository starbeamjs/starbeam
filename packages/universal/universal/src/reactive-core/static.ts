import type { Description } from "@starbeam/debug";
import { Desc } from "@starbeam/debug";
import type { Reactive } from "@starbeam/interfaces";
import { REACTIVE } from "@starbeam/shared";

export function Static<T>(
  value: T,
  description?: string | Description
): Reactive<T> {
  return Object.freeze({
    [REACTIVE]: {
      type: "static",
      description: Desc("static", description),
    },
    current: value,
    read: () => value,
  });
}
