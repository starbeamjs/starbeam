import type { Runtime as IRuntime, TagSnapshot } from "@starbeam/interfaces";
import { defineRuntime } from "@starbeam/reactive";
import {
  consume,
  linkToFinalizationScope,
  mountFinalizationScope,
  pushFinalizationScope,
  start,
} from "@starbeam/shared";

import { SUBSCRIPTION_RUNTIME } from "./timeline/render.js";

export const RUNTIME: IRuntime = {
  start: (): (() => TagSnapshot) => {
    const done = start();

    return () => new Set(done()) as TagSnapshot;
  },

  consume: (tag): void => void consume(tag),

  ...SUBSCRIPTION_RUNTIME,
};

defineRuntime(RUNTIME);

export type FinalizationScope = object;

export function createPushScope(
  options?:
    | {
        priority?: number | undefined;
      }
    | undefined,
): FinalizationScope {
  return pushFinalizationScope(undefined, options?.priority)();
}

export function createMountScope(): FinalizationScope {
  return mountFinalizationScope()();
}

export function link(parent: FinalizationScope, child: object): () => void {
  return linkToFinalizationScope(child, parent);
}

export function pushingScope<T>(
  block: (childScope: object) => T,
  options: {
    childScope: object | undefined;
    priority?: number | undefined;
  },
): T;
export function pushingScope<T>(
  block: (childScope: object) => T,
  options?: {
    priority?: number | undefined;
  },
): [object, T];
export function pushingScope<T>(
  block: (childScope: object) => T,
  options?: {
    childScope?: object | undefined;
    priority?: number | undefined;
  },
): unknown {
  const childScope = options?.childScope;

  const doneScope = pushFinalizationScope(childScope, options?.priority);
  let isDone = false;

  try {
    const result = (block as (childScope?: object) => unknown)(childScope);
    const scope = doneScope();
    isDone = true;

    return childScope === undefined ? [scope, result] : result;
  } catch (e) {
    if (!isDone) doneScope();
    throw e;
  }
}
