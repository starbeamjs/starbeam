import type { Reactive } from "@starbeam/interfaces";
import { isReactive } from "@starbeam/reactive";

import type { RunResult, UpdateResource } from "./types.js";

export type Cleanup<M> = (metadata: M) => void;

export function assimilateResource<T>(value: T | Reactive<T>): T {
  if (isReactive(value)) {
    return value.current;
  } else {
    return value;
  }
}

export function getRunInstance<T>(
  result: Reactive<RunResult<T, unknown>>
): T | undefined {
  return result.current.value.instance;
}

export function updateResource<T, M>(
  updater: UpdateResource<T, M>
): UpdateResource<T, M> {
  return updater;
}
