import { registerDestructor } from "@glimmer/destroyable";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { setupResource as setupStarbeamResource } from "@starbeam/resource";
import { CONTEXT, pushingScope, RUNTIME } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import { finalize, onFinalize } from "@starbeam/shared";

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
  const resource = pushingScope(() => setupStarbeamResource(intoBlueprint), {
    childScope: parent,
  });

  resource.sync();

  let active = true;
  let scheduled = false;

  const flush = (): void => {
    if (!active) return;
    resource.sync();
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

  registerDestructor(parent, () => {
    active = false;
    finalize(parent);
  });

  return resource.value;
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
  return service(blueprint, { app: app ?? CONTEXT.app });
}
