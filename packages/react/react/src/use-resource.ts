import type { Description, Reactive } from "@starbeam/interfaces";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { render, RUNTIME } from "@starbeam/runtime";
import {
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { internalUseResource } from "./element.js";
import { useNotify } from "./use-reactive.js";

export function setupResource<T>(
  factory: IntoResourceBlueprint<T>,
  options?:
    | { initial?: T; description?: string | Description | undefined }
    | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  return createResource(
    factory as IntoResourceBlueprint<T | undefined>,
    options,
    dependencies
  );
}

export function useResource<T>(
  factory: IntoResourceBlueprint<T>,
  options?:
    | { initial?: T; description?: string | Description | undefined }
    | unknown[],
  dependencies?: unknown[]
): T | undefined {
  const value = setupResource(factory, options, dependencies);

  return unsafeTrackedElsewhere(() => value.read());
}

function createResource<T>(
  factory: IntoResourceBlueprint<T>,
  options?: { initial?: T } | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  const notify = useNotify();

  function normalize(): {
    deps: unknown[];
    initialValue: T | undefined;
  } {
    if (Array.isArray(options)) {
      return { deps: options, initialValue: undefined };
    } else {
      return {
        deps: dependencies ?? [],
        initialValue: options?.initial,
      };
    }
  }

  const { deps, initialValue } = normalize();

  return useLifecycle({
    props: factory,
    validate: deps,
    with: sameDeps,
  }).render<Reactive<T | undefined>>(({ on }, _) => {
    const lifetime = {};
    const resource = internalUseResource(
      lifetime,
      {
        on: {
          layout: (callback) => {
            if (!callback) return;
            return void on.layout(() => void callback(factory));
          },
          cleanup: (callback) => {
            if (!callback) return;
            return void on.cleanup(() => void callback());
          },
        },
        notify,
        render: (reactive) => void on.cleanup(render(reactive, notify)),
      },
      initialValue
    );

    on.cleanup(() => {
      RUNTIME.finalize(lifetime);
    });

    return resource;
  });
}

export function sameDeps(
  next: unknown[] | undefined,
  prev: unknown[] | undefined
): boolean {
  if (prev === undefined || next === undefined) {
    return prev === next;
  }

  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((value, index) => Object.is(value, next[index]));
}
