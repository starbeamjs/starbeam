import { DEBUG } from "@starbeam/reactive";
import {
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
  type UseReactive,
} from "@starbeam/renderer";
import type { IntoResourceBlueprint, Resource } from "@starbeam/resource";
import { use } from "@starbeam/resource";
import { service as createService } from "@starbeam/service";
import type { Reactive } from "@starbeam/universal";
import { isPresent, verified } from "@starbeam/verify";
import { useMemo } from "preact/hooks";

import { getCurrentComponent } from "./options.js";
import { MANAGER } from "./renderer.js";

export function setupReactive<T>(blueprint: UseReactive<T>): Reactive<T> {
  DEBUG?.markEntryPoint(["function:call", "setupReactive"]);
  return managerSetupReactive(MANAGER, blueprint);
}

export function useReactive<T>(blueprint: UseReactive<T>): T {
  DEBUG?.markEntryPoint(["function:call", "useReactive"]);
  return setupReactive(blueprint).read();
}

export function setupResource<T>(
  blueprint: IntoResourceBlueprint<T>
): Resource<T> {
  DEBUG?.markEntryPoint(["function:call", "setupResource"]);
  return managerSetupResource(MANAGER, blueprint);
}

export function useResource<T>(blueprint: IntoResourceBlueprint<T>): T {
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
  return setupResource(blueprint).read();
}

export function setup<T>(blueprint: IntoResourceBlueprint<T>): T {
  DEBUG?.markEntryPoint(["function:call", "setup"]);
  const result = useMemo(() => {
    const owner = verified(getCurrentComponent(), isPresent);
    return use(blueprint, { lifetime: owner });
  }, []);
  return result();
}

export function service<T>(blueprint: IntoResourceBlueprint<T>): T {
  DEBUG?.markEntryPoint(["function:call", "service"]);
  return useMemo(() => {
    return createService(blueprint);
  }, []).read();
}
