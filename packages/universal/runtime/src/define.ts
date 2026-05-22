import type {
  CellTag,
  Runtime as IRuntime,
  RuntimeHooks,
  Tag,
  TagSnapshot,
} from "@starbeam/interfaces";
import { defineRuntime } from "@starbeam/reactive";
import {
  consume,
  linkToFinalizationScope,
  mountFinalizationScope,
  pushFinalizationScope,
  start,
} from "@starbeam/shared";

import { SUBSCRIPTION_RUNTIME } from "./timeline/render.js";

const HOOKS = new Set<RuntimeHooks>();
const NO_HOOKS = 0;

export function addRuntimeHooks(hooks: RuntimeHooks): () => void {
  HOOKS.add(hooks);

  return () => void HOOKS.delete(hooks);
}

function notifyConsume(tag: Tag): void {
  if (HOOKS.size === NO_HOOKS) return;

  for (const hooks of HOOKS) {
    hooks.consume?.(tag);
  }
}

function notifyMark(cell: CellTag): void {
  if (HOOKS.size === NO_HOOKS) return;

  for (const hooks of HOOKS) {
    hooks.mark?.(cell);
  }
}

export const RUNTIME: IRuntime = {
  start: (): (() => TagSnapshot) => {
    const done = start();

    return () => new Set(done()) as TagSnapshot;
  },

  consume: (tag): void => {
    consume(tag);
    notifyConsume(tag);
  },

  subscribe: SUBSCRIPTION_RUNTIME.subscribe,
  mark: (cell, mark): void => {
    SUBSCRIPTION_RUNTIME.mark(cell, mark);
    notifyMark(cell);
  },
  update: SUBSCRIPTION_RUNTIME.update,
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

export function scoped<const T>(block: (childScope: object) => T): [object, T] {
  const childScope = mountFinalizationScope()();
  const result = block(childScope);

  return [childScope, result];
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
