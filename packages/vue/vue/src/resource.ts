import type { ReadValue } from "@starbeam/reactive";
import type { UseReactive } from "@starbeam/renderer";
import {
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
} from "@starbeam/renderer";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import type { Ref } from "vue";

import { MANAGER } from "./renderer.js";
import { useReactive } from "./setup.js";

export function setupReactive<T>(blueprint: UseReactive<T>): Ref<ReadValue<T>> {
  const vueInstance = useReactive();
  const reactive = managerSetupReactive(MANAGER, blueprint);

  // whenever the component is about to render, update the Vue ref from the
  // current value of the reactive.
  return vueInstance.copiedRef(reactive);
}

export function setupResource<T>(intoBlueprint: IntoResourceBlueprint<T>): T {
  return managerSetupResource(MANAGER, intoBlueprint);
}

export function setupService<T>(blueprint: IntoResourceBlueprint<T>): T {
  useReactive();

  return managerSetupService(MANAGER, blueprint);
}
