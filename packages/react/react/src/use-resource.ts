import { type Description } from "@starbeam/debug";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { LIFETIME } from "@starbeam/runtime";
import { type Reactive } from "@starbeam/universal";
import {
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { internalUseResource } from "./element.js";
import { useNotify } from "./use-reactive.js";

export function use<T>(
  factory: IntoResourceBlueprint<T, void>,
  options?:
    | { initial?: T; description?: string | Description | undefined }
    | unknown[],
  dependencies?: unknown[]
): T | undefined {
  const value = createResource(
    factory as IntoResourceBlueprint<T | undefined, void>,
    options,
    dependencies
  );

  return unsafeTrackedElsewhere(() => value.current);
}

function createResource<T>(
  factory: IntoResourceBlueprint<T, void>,
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

  return useLifecycle({ props: factory, validate: deps }).render<
    Reactive<T | undefined>
  >(({ on, validate }, _) => {
    validate(sameDeps);

    const lifetime = {};
    const resource = internalUseResource(
      lifetime,
      { on, notify },
      initialValue
    );

    on.cleanup(() => {
      LIFETIME.finalize(lifetime);
    });

    return resource;
  });
}

export function sameDeps(
  prev: unknown[] | undefined,
  next: unknown[] | undefined
): boolean {
  if (prev === undefined || next === undefined) {
    return prev === next;
  }

  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((value, index) => Object.is(value, next[index]));
}
