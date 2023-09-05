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

export function createPushScope(): FinalizationScope {
  return pushFinalizationScope()();
}

export function createMountScope(): FinalizationScope {
  return mountFinalizationScope()();
}

export function link(parent: FinalizationScope, child: object): () => void {
  return linkToFinalizationScope(child, { parent });
}

export function pushingScope<T>(
  block: (childScope: object) => T,
  options: {
    childScope: object | undefined;
  },
): T;
export function pushingScope<const T>(
  block: (childScope: object) => T,
): [object, T];
export function pushingScope<T>(
  block: (childScope: object) => T,
  options?: {
    childScope?: object | undefined;
  },
): unknown {
  const childScope = options?.childScope;

  const doneScope = pushFinalizationScope(childScope);

  const result = (block as (childScope?: object) => unknown)(childScope);
  // FIXME: Error handling
  const scope = doneScope();

  return childScope === undefined ? [scope, result] : result;
}

export function withinScope<T>(
  scopeToMount: FinalizationScope | undefined,
  block: (childScope: object) => T,
): unknown {
  const doneScope = mountFinalizationScope(scopeToMount);

  const result = (block as (childScope?: object) => unknown)(scopeToMount);
  // FIXME: Error handling
  const scope = doneScope();

  return scopeToMount === undefined ? [scope, result] : result;
}
