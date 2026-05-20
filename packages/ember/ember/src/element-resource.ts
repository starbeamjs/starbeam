import type { ElementResourceBlueprint as RendererElementResourceBlueprint } from "@starbeam/renderer";
import { setupElementResource } from "@starbeam/renderer";
import { RUNTIME } from "@starbeam/runtime";
import { modifier } from "ember-modifier";

import { TrackedTag } from "./tracked.js";

export type ElementResourceBlueprint<
  E extends Element,
  T,
> = RendererElementResourceBlueprint<E, T>;

export type ElementResourceSink<T> = (value: T | null) => void;

export interface ElementResourceModifierOptions<T> {
  /**
   * Called with the resource's value after every sync, and with `null` when
   * the modifier is torn down.
   */
  readonly into?: ElementResourceSink<T> | undefined;
}

export interface ElementResourceHandle<E extends Element, T> {
  /**
   * Autotracked: reading inside a Glimmer autotracking frame registers the
   * handle as a dependency, and writes from the resource invalidate it.
   *
   * `null` before the modifier is attached and after it is torn down.
   */
  readonly current: T | null;

  /**
   * The Ember modifier that attaches the resource to its element. Apply with
   * the standard `{{modifier-name}}` invocation, or pass it through
   * a `@type-of-modifier` argument.
   */
  readonly modifier: ReturnType<typeof modifier<E, [], object>>;
}

/**
 * Wrap an element-backed Starbeam resource as an Ember modifier.
 *
 * The blueprint receives the modified element and returns a resource. The
 * resource is created on `install`, synced once, and finalized on teardown.
 * Sync invalidations are coalesced into microtasks.
 *
 * Pass `options.into` to publish the resource value into caller-owned storage
 * (a tracked field, an `ElementResourceHandle`, etc.).
 */
export function elementResourceModifier<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  options: ElementResourceModifierOptions<T> = {},
): ReturnType<typeof modifier<E, [], object>> {
  return modifier<E, [], object>((element) => {
    let active = true;
    let scheduled = false;

    const resource = setupElementResource(blueprint, element);

    resource.sync();
    options.into?.(resource.value);

    const flush = (): void => {
      if (!active) return;
      resource.sync();
      options.into?.(resource.value);
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

    return () => {
      active = false;
      unsubscribe?.();
      resource.finalize();
      options.into?.(null);
    };
  });
}

/**
 * Convenience handle for element-backed resources: pairs a tracked `current`
 * value with a modifier that publishes into it.
 *
 * Read `handle.current` inside any autotracking frame (template, getter, etc.).
 * Apply `handle.modifier` to the element that backs the resource.
 */
export function elementResource<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
): ElementResourceHandle<E, T> {
  const tag = new TrackedTag();
  let value: T | null = null;

  const publish: ElementResourceSink<T> = (next) => {
    value = next;
    tag.dirty();
  };

  return {
    get current(): T | null {
      tag.consume();
      return value;
    },
    modifier: elementResourceModifier(blueprint, { into: publish }),
  };
}
