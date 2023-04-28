import {
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
  type ReactiveBlueprint,
} from "@starbeam/renderer";
import type {
  IntoResourceBlueprint,
  ResourceBlueprint,
} from "@starbeam/resource";
import { type Ref } from "vue";

import { MANAGER } from "./renderer.js";

export function setupReactive<T>(blueprint: ReactiveBlueprint<T>): Ref<T> {
  return MANAGER.toNative(managerSetupReactive(MANAGER, blueprint));
}

export function setupResource<T>(
  blueprint: ResourceBlueprint<T, void>
): Ref<T> {
  return MANAGER.toNative(managerSetupResource(MANAGER, blueprint));
}

export function setupService<T>(blueprint: IntoResourceBlueprint<T>): Ref<T> {
  return MANAGER.toNative(managerSetupService(MANAGER, blueprint));
}
