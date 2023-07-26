import { DEBUG } from "@starbeam/reactive";
import {
  type Lifecycle,
  managerCreateLifecycle,
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
  type UseReactive,
} from "@starbeam/renderer";
import type {
  IntoResourceBlueprint,
  Resource,
  ResourceBlueprint,
  ResourceConstructor,
} from "@starbeam/resource";
import { type Reactive } from "@starbeam/universal";
import { useMemo } from "preact/hooks";

import { MANAGER } from "./renderer.js";

export function setupReactive<T>(blueprint: UseReactive<T>): Reactive<T> {
  DEBUG?.markEntryPoint(["function:call", "setupReactive"]);
  return managerSetupReactive(MANAGER, blueprint);
}

export function useReactive<T>(
  blueprint: UseReactive<T>,

  /**
   * Preact currently doesn't support deps, but when we support deps, you will
   * need to pass `[]` when there are no dependencies.
   */
  _deps: []
): T {
  DEBUG?.markEntryPoint(["function:call", "useReactive"]);
  return setupReactive(blueprint).read();
}

export function setupResource<T>(
  blueprint: IntoResourceBlueprint<T>
): Resource<T> {
  DEBUG?.markEntryPoint(["function:call", "setupResource"]);
  return managerSetupResource(MANAGER, blueprint);
}

export function useResource<T>(blueprint: ResourceBlueprint<T>): T;
export function useResource<T>(setup: ResourceConstructor<T>, deps: []): T;
export function useResource<T>(
  blueprint: IntoResourceBlueprint<T>,
  /**
   * Preact currently doesn't support deps, but when we support deps, you will
   * need to pass `[]` when there are no dependencies.
   */
  _deps?: []
): T {
  DEBUG?.markEntryPoint(["function:call", "useResource"]);
  return setupResource(blueprint).read();
}

export function setupService<T>(
  blueprint: IntoResourceBlueprint<T>
): Resource<T> {
  DEBUG?.markEntryPoint(["function:call", "setupResource"]);
  return managerSetupService(MANAGER, blueprint);
}

export function useService<T>(blueprint: IntoResourceBlueprint<T>): T {
  DEBUG?.markEntryPoint(["function:call", "useResource"]);
  return setupService(blueprint).read();
}

export function setup<T>(blueprint: (lifecycle: Lifecycle) => T): T {
  DEBUG?.markEntryPoint(["function:call", "setup"]);
  const lifecycle = managerCreateLifecycle(MANAGER);
  return useMemo(() => blueprint(lifecycle), []);
}
