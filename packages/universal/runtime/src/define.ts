import type { Runtime as IRuntime, TagSnapshot } from "@starbeam/interfaces";
import { defineRuntime } from "@starbeam/reactive";
import {
  consume,
  linkToFinalizationScope,
  pushFinalizationScope,
  start,
} from "@starbeam/shared";

import { LIFETIME } from "./lifetime/api.js";
import { SUBSCRIPTION_RUNTIME } from "./timeline/render.js";

export const RUNTIME: IRuntime = {
  start: (): (() => TagSnapshot) => {
    const done = start();

    return () => new Set(done()) as TagSnapshot;
  },

  consume: (tag): void => void consume(tag),

  link: (parent, child) => LIFETIME.link(parent, child),
  finalize: (object) => void LIFETIME.finalize(object),
  onFinalize: (object, callback) => LIFETIME.on.cleanup(object, callback),

  ...SUBSCRIPTION_RUNTIME,
};

defineRuntime(RUNTIME);

export type FinalizationScope = object;

export function createScope(): FinalizationScope {
  return pushFinalizationScope()();
}

export function link(parent: FinalizationScope, child: object): () => void {
  return linkToFinalizationScope(child, parent);
}

export function scoped<T>(block: () => T): [object, T];
export function scoped<T>(
  block: (childScope: object) => T,
  childScope: object
): T;
export function scoped(
  block: (childScope: object) => unknown,
  childScope?: object
): unknown {
  const doneScope = pushFinalizationScope(childScope);
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
