import { callerStack } from "@starbeam/debug";
import { LIFETIME, TIMELINE } from "@starbeam/timeline";
import {
  type IntoResource,
  type Reactive,
  type ResourceBlueprint,
  Factory,
  Formula,
  Marker,
} from "@starbeam/universal";
import {
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { useNotify } from "./use-reactive.js";
import { useComponent } from "./use-setup.js";

export type UseFactory<T, D extends undefined> =
  | ResourceBlueprint<T, D>
  | (() => IntoResource<T>);

export function use<T>(
  factory: ResourceBlueprint<T> | (() => ResourceBlueprint<T>),
  dependencies?: unknown[]
): T;
// export function use<T>(
//   factory: ResourceBlueprint<T, UNINITIALIZED>
// ): T | undefined;
// export function use<T>(
//   factory: UseFactory<T, UNINITIALIZED>,
//   dependencies: unknown[]
// ): T | undefined;
// export function use<T>(
//   factory: UseFactory<T, never>,
//   dependencies: unknown[]
// ): T;
// export function use<T>(
//   factory: UseFactory<T, UNINITIALIZED> | UseFactory<T, never>,
//   options: { initial: T },
//   dependencies: unknown[]
// ): T;

export function use<T>(
  factory: UseFactory<T, undefined>,
  options?: { initial: T } | unknown[],
  dependencies?: unknown[]
): T | undefined {
  const value = createResource(factory, options, dependencies);

  return unsafeTrackedElsewhere(() => value.current);
}

export function useResource<T>(factory: ResourceBlueprint<T>): T;
export function useResource<T>(
  factory: ResourceBlueprint<T, undefined>
): T | undefined;
export function useResource<T>(
  factory: UseFactory<T, undefined>,
  dependencies: unknown[]
): Reactive<T | undefined>;
export function useResource<T>(
  factory: UseFactory<T, never>,
  dependencies: unknown[]
): Reactive<T>;
export function useResource<T>(
  factory: UseFactory<T, undefined>,
  options?: { initial: T } | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  return createResource(factory, options, dependencies);
}

function createResource<T>(
  factory: UseFactory<T, undefined>,
  options?: { initial: T } | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  const owner = useComponent();
  const notify = useNotify();

  const deps = Array.isArray(options) ? options : dependencies ?? [];
  const initialValue = Array.isArray(options) ? undefined : options?.initial;
  let prev: unknown[] = deps;

  return useLifecycle(deps, ({ on }) => {
    let lastResource: Reactive<T | undefined> | undefined = undefined;
    const marker = Marker();

    function create(): void {
      if (lastResource) LIFETIME.finalize(lastResource);

      const created: Reactive<T | undefined> =
        typeof factory === "function"
          ? Factory.resource(factory() as IntoResource<T | undefined>, owner)
          : factory.create(owner);

      lastResource = created;
      marker.update(callerStack());

      on.cleanup(() => {
        LIFETIME.finalize(created);
      });
    }

    on.layout(create);

    on.update((next = []) => {
      if (!sameDeps(prev, next)) {
        prev = next;
        if (lastResource) LIFETIME.finalize(lastResource);
        create();
      }
    });

    const value = Formula(() => {
      marker.consume();
      return lastResource?.current ?? initialValue;
    });

    on.cleanup(TIMELINE.on.change(value, notify));

    return value;
  });
}

function sameDeps(
  prev: unknown[] | undefined,
  next: unknown[] | undefined
): boolean {
  if (prev === undefined || next === undefined) {
    return prev === next;
  }

  return (
    prev.length === next.length &&
    prev.every((value, index) => Object.is(value, next[index]))
  );
}
