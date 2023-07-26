import type { Reactive } from "@starbeam/interfaces";
import { read } from "@starbeam/reactive";
import type { ReactiveBlueprint } from "@starbeam/renderer";
import {
  type IntoResourceBlueprint,
  type ResourceBlueprint,
  type ResourceConstructor,
} from "@starbeam/resource";
import {
  unsafeTrackedElsewhere,
  useLastRenderRef,
} from "@starbeam/use-strict-lifecycle";

import { createReactive, createResource } from "./setup.js";

/**
 * The `useReactive` hook takes a reactive value or {@linkcode ReactiveBlueprint}.
 *
 * - If you pass a `Reactive<T>`, `useReactive` returns a `T`
 * - If you pass a function that returns a `Reactive<T>`, `useReactive`
 *   returns a `T`
 *
 * This hook behaves like {@linkcode setupReactive}, except that it returns a
 * regular value rather than a reactive value.
 *
 * FIXME: The overload is causing the type error from missing `[]` to be very
 * confusing (i.e. function is not reactive).
 */

export function useReactive<T>(
  blueprint: ReactiveBlueprint<T>,
  deps: unknown[]
): T;
export function useReactive<T>(blueprint: Reactive<T>): T;
export function useReactive<T>(
  ...args:
    | [blueprint: Reactive<T>]
    | [blueprint: ReactiveBlueprint<T>, deps: unknown[]]
): T {
  const [blueprint, deps] = args;

  const [currentBlueprint] = useLastRenderRef(blueprint);
  const reactive = createReactive(currentBlueprint, deps);

  return unsafeTrackedElsewhere(() => reactive.read());
}

export function useService<T>(blueprint: IntoResourceBlueprint<T>): T {
  return useReactive(({ service }) => service(blueprint), []);
}

export function useResource<T>(blueprint: ResourceBlueprint<T>): T;
export function useResource<T>(
  blueprint: ResourceConstructor<T>,
  deps: unknown[]
): T;
export function useResource<T>(
  blueprint: IntoResourceBlueprint<T>,
  deps?: unknown[]
): T {
  const instance = createResource(blueprint, deps);
  return unsafeTrackedElsewhere(() => read(instance));
}
