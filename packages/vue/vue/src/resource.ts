import type { ReadValue } from "@starbeam/reactive";
import {
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
  type UseReactive,
} from "@starbeam/renderer";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { type Ref } from "vue";

import { MANAGER } from "./renderer.js";

export function setupReactive<T>(blueprint: UseReactive<T>): Ref<ReadValue<T>> {
  return MANAGER.toNative(managerSetupReactive(MANAGER, blueprint));
}

export function setupResource<T>(blueprint: IntoResourceBlueprint<T>): T {
  return managerSetupResource(MANAGER, blueprint);
}

export function setupService<T>(blueprint: IntoResourceBlueprint<T>): T {
  return managerSetupService(MANAGER, blueprint);
}
