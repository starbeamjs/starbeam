import type { IntoResourceBlueprint, SyncFn } from "@starbeam/resource";
import { setupResource } from "@starbeam/resource";
import { pushingScope, RUNTIME } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import type { Attachment } from "svelte/attachments";

export type ElementResourceBlueprint<E extends Element, T> = (
  element: E,
) => IntoResourceBlueprint<T>;

export type ElementResourceSink<T> = (value: T | null) => void;

export type ElementResourceAttachment<E extends Element = Element> =
  Attachment<E>;

interface ResourceState<T> {
  readonly scope: object;
  readonly sync: SyncFn<void>;
  readonly value: T;
}

interface Readable<T> {
  readonly subscribe: (run: (value: T) => void) => () => void;
}

export function elementResourceAttachment<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  options: { readonly into?: ElementResourceSink<T> | undefined } = {},
): ElementResourceAttachment<E> {
  return (element) => {
    let active = true;
    let scheduled = false;

    const resource = createElementResource(blueprint, element);

    resource.sync();
    options.into?.(resource.value);

    const scheduleSync = () => {
      if (scheduled) return;
      scheduled = true;

      queueMicrotask(() => {
        scheduled = false;
        if (!active) return;
        resource.sync();
        options.into?.(resource.value);
      });
    };

    const unsubscribe = RUNTIME.subscribe(resource.sync, scheduleSync);

    return () => {
      active = false;
      unsubscribe?.();
      finalize(resource.scope);
      options.into?.(null);
    };
  };
}

export function elementResourceStore<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
): Readable<T | null> & { readonly attach: ElementResourceAttachment<E> } {
  let value: T | null = null;
  const subscribers = new Set<(value: T | null) => void>();

  const publish: ElementResourceSink<T> = (next) => {
    value = next;

    for (const subscriber of subscribers) {
      subscriber(value);
    }
  };

  const store: Readable<T | null> = {
    subscribe: (run) => {
      run(value);
      subscribers.add(run);

      return () => {
        subscribers.delete(run);
      };
    },
  };

  return Object.assign(store, {
    attach: elementResourceAttachment(blueprint, {
      into: (value) => void publish(value),
    }),
  });
}

function createElementResource<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  element: E,
): ResourceState<T> {
  const [scope, resource] = pushingScope(() =>
    setupResource(blueprint(element)),
  );

  return {
    scope,
    sync: resource.sync,
    value: resource.value,
  };
}
