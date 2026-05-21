import { capabilities, invokeHelper, setHelperManager } from "@ember/helper";
import { getOwner } from "@ember/owner";
import { registerDestructor } from "@glimmer/destroyable";
import { getValue as getGlimmerCacheValue } from "@glimmer/tracking/primitives/cache";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { setupResource as setupStarbeamResource } from "@starbeam/resource";
import { CONTEXT, pushingScope, RUNTIME } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import { finalize, onFinalize } from "@starbeam/shared";

import { TrackedTag } from "./tracked.js";

interface ResourceHelperDefinition<T> {
  (): T;
  readonly blueprint: IntoResourceBlueprint<T>;
}

interface ResourceState<T> {
  readonly parent: object;
  readonly tag: TrackedTag;
  readonly value: T;
  readonly disconnect: () => void;
}

interface HelperArguments {
  readonly positional: readonly unknown[];
  readonly named: Record<string, unknown>;
}

interface ResourceCache<T> {
  readonly cache: ReturnType<typeof invokeHelper>;
  readonly __starbeamEmberCache?: T | undefined;
}

function setupResourceState<T>(
  intoBlueprint: IntoResourceBlueprint<T>,
  parent: object,
): ResourceState<T> {
  const resource = pushingScope(() => setupStarbeamResource(intoBlueprint), {
    childScope: parent,
  });

  const tag = new TrackedTag();

  resource.sync();

  let active = true;
  let scheduled = false;

  const flush = (): void => {
    if (!active) return;
    resource.sync();
    tag.dirty();
  };

  const schedule = (): void => {
    if (scheduled || !active) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      flush();
    });
  };

  const unsubscribe = RUNTIME.subscribe(resource.sync, schedule);
  if (unsubscribe) onFinalize(parent, unsubscribe);

  const disconnect = (): void => {
    if (!active) return;
    active = false;
    finalize(parent);
  };

  registerDestructor(parent, disconnect);

  return { parent, tag, value: resource.value, disconnect };
}

class StarbeamResourceHelperManager {
  readonly capabilities = capabilities("3.23", {
    hasValue: true,
    hasDestroyable: true,
  });

  createHelper<T>(
    definition: ResourceHelperDefinition<T>,
    _args: HelperArguments,
  ): ResourceState<T> {
    const parent = {};
    return setupResourceState(definition.blueprint, parent);
  }

  getValue<T>({ tag, value }: ResourceState<T>): T {
    tag.consume();
    return value;
  }

  getDestroyable({ parent }: ResourceState<unknown>): object {
    return parent;
  }
}

const RESOURCE_HELPER_MANAGER = new StarbeamResourceHelperManager();
const invokeEmberHelper = invokeHelper as (
  parent: object,
  definition: object,
) => object;
const getCacheValue = getGlimmerCacheValue as (cache: object) => unknown;
const OWNERS = new WeakSet<object>();

function resourceHelperDefinition<T>(
  blueprint: IntoResourceBlueprint<T>,
): ResourceHelperDefinition<T> {
  const definition = (() => undefined as T) as ResourceHelperDefinition<T>;
  Object.defineProperty(definition, "blueprint", { value: blueprint });

  return setHelperManager(() => RESOURCE_HELPER_MANAGER, definition);
}

export function resource<T>(
  blueprint: IntoResourceBlueprint<T>,
): ResourceHelperDefinition<T> {
  return resourceHelperDefinition(blueprint);
}

export function useResource<T>(
  parent: object,
  blueprint: IntoResourceBlueprint<T>,
): ResourceCache<T> {
  return { cache: invokeEmberHelper(parent, resource(blueprint)) };
}

export function getResource<T>(cache: ResourceCache<T>): T {
  const value = getCacheValue(cache.cache as object);
  return value as T;
}

/**
 * Set up a Starbeam resource whose lifetime is tied to `parent`. When `parent`
 * is destroyed (via `@ember/destroyable`), the resource is finalized and any
 * sync subscriptions are torn down.
 *
 * Sync runs synchronously the first time and after every Starbeam-level
 * invalidation. Invalidations are coalesced into a microtask so multiple
 * upstream writes do not produce multiple sync calls.
 */
export function setupResource<T>(
  intoBlueprint: IntoResourceBlueprint<T>,
  parent: object,
): T {
  return setupResourceState(intoBlueprint, parent).value;
}

export function setupReactiveResource<T>(
  intoBlueprint: IntoResourceBlueprint<T>,
  parent: object,
): {
  readonly current: T;
  readonly disconnect: () => void;
} {
  const resource = setupResourceState(intoBlueprint, parent);

  return {
    get current(): T {
      resource.tag.consume();
      return resource.value;
    },
    disconnect: resource.disconnect,
  };
}

function ownerFor(context: object): object {
  return getOwner(context) ?? context;
}

function registerOwner(owner: object): void {
  if (OWNERS.has(owner)) return;

  OWNERS.add(owner);
  registerDestructor(owner, () => void finalize(owner));
}

/**
 * Set up an app-scoped Starbeam service. Multiple components in the same Ember
 * application that ask for the same blueprint receive the same instance, which
 * is finalized when the Ember owner is destroyed.
 *
 * Pass the Ember owner (e.g. via `getOwner(this)`) as `app`. If omitted, the
 * current Starbeam app context is used.
 */
export function setupService<T>(
  intoBlueprint: IntoResourceBlueprint<T>,
  app?: object,
): T {
  const blueprint =
    typeof intoBlueprint === "function" ? intoBlueprint() : intoBlueprint;
  const owner = app ?? CONTEXT.app;
  registerOwner(owner);

  return service(blueprint, { app: owner });
}

export function useService<T>(
  context: object,
  intoBlueprint: IntoResourceBlueprint<T>,
): T {
  return setupService(intoBlueprint, ownerFor(context));
}
