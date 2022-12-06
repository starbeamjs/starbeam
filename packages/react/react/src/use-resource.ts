import type { Description } from "@starbeam/debug";
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

export function use<T, Initial extends undefined>(
  factory:
    | ResourceBlueprint<T, Initial>
    | (() => ResourceBlueprint<T, Initial>),
  dependencies?: unknown[]
): T | Initial;
export function use<T>(
  factory: ResourceBlueprint<T> | (() => ResourceBlueprint<T>),
  options: { initial: T; description?: string | Description | undefined }
): T;
export function use<T, Initial extends undefined>(
  factory: ResourceBlueprint<T> | (() => ResourceBlueprint<T, Initial>),
  options: { description?: string | Description | undefined }
): T | Initial;
export function use<T>(
  factory: IntoResource<T>,
  options?:
    | { initial?: T; description?: string | Description | undefined }
    | unknown[],
  dependencies?: unknown[]
): T | undefined {
  const value = createResource(
    factory as IntoResource<T | undefined>,
    options,
    dependencies
  );

  return unsafeTrackedElsewhere(() => value.current);
}

export function useResource<T, D extends undefined>(
  factory: () => ResourceBlueprint<T, D>,
  dependencies: unknown[]
): Reactive<T | D>;
export function useResource<T, D extends undefined>(
  factory: ResourceBlueprint<T, D>
): T | D;
export function useResource<T>(
  factory: IntoResource<T>,
  options?: { initial: T } | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  return createResource(factory, options, dependencies);
}

function createResource<T>(
  factory: IntoResource<T>,
  options?:
    | { initial?: T; description?: string | Description | undefined }
    | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  const owner = useComponent();
  const notify = useNotify();

  const deps: unknown[] = Array.isArray(options) ? options : dependencies ?? [];
  const initialValue = Array.isArray(options) ? undefined : options?.initial;
  let prev: unknown[] = deps;

  let stable = {};

  return useLifecycle([deps, factory] as const, ({ on }) => {
    on.cleanup(() => {
      LIFETIME.finalize(stable);
    });

    let lastResource: Reactive<T | undefined> | undefined = undefined;
    const marker = Marker();

    function create(factory: IntoResource<T>): void {
      LIFETIME.finalize(stable);
      stable = {};

      const created: Reactive<T | undefined> = Factory.resource(factory, owner);

      lastResource = created;
      LIFETIME.link(stable, lastResource);
      marker.update(callerStack());

      const unsubscribe = TIMELINE.on.change(value, () => {
        notify();
      });

      LIFETIME.link(stable, created);

      LIFETIME.on.cleanup(stable, () => {
        unsubscribe();

        lastResource = undefined;
        marker.update(callerStack());
      });

      notify();
    }

    on.layout(([_, factory]) => {
      create(factory);
    });

    on.update(([nextDeps, factory]) => {
      if (!sameDeps(prev, nextDeps) || lastResource === undefined) {
        prev = nextDeps;

        LIFETIME.finalize(stable);
        stable = {};
        create(factory);
      }
    });

    const value = Formula(() => {
      marker.consume();

      return lastResource?.current ?? initialValue;
    });

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
