import type { ElementResourceBlueprint as RendererElementResourceBlueprint } from "@starbeam/renderer";
import { setupElementResource } from "@starbeam/renderer";
import { RUNTIME } from "@starbeam/runtime";
import type { Attachment } from "svelte/attachments";

type SvelteReadable<T> = import("svelte/store").Readable<T>;
type SvelteSubscriber<T> = import("svelte/store").Subscriber<T>;
type SvelteUnsubscriber = import("svelte/store").Unsubscriber;

export type ElementResourceBlueprint<
  E extends Element,
  T,
> = RendererElementResourceBlueprint<E, T>;

export type ElementResourceSink<T> = (value: T | null) => void;

export type ElementResourceAttachment<E extends Element = Element> =
  Attachment<E>;

export type ElementResourceHandle<
  E extends Element = Element,
  T = unknown,
> = SvelteReadable<T | null> & {
  readonly attach: ElementResourceAttachment<E>;
};

export function elementResourceAttachment<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  options: { readonly into?: ElementResourceSink<T> | undefined } = {},
): ElementResourceAttachment<E> {
  return (element) => {
    let active = true;
    let scheduled = false;

    const resource = setupElementResource(blueprint, element);

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
      resource.finalize();
      options.into?.(null);
    };
  };
}

export function elementResourceStore<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
): ElementResourceHandle<E, T> {
  let value: T | null = null;
  const subscribers = new Set<SvelteSubscriber<T | null>>();

  const publish: ElementResourceSink<T> = (next) => {
    value = next;

    for (const subscriber of subscribers) {
      subscriber(value);
    }
  };

  const store: SvelteReadable<T | null> = {
    subscribe: (run, _invalidate): SvelteUnsubscriber => {
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

export function elementResource<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
): ElementResourceHandle<E, T> {
  return elementResourceStore(blueprint);
}
