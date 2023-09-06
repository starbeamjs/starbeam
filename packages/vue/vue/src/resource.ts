import type { ReadValue } from "@starbeam/reactive";
import {
  managerSetupReactive,
  managerSetupService,
  type UseReactive,
} from "@starbeam/renderer";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { pushingScope, RUNTIME } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import {
  effectScope,
  onMounted,
  onScopeDispose,
  type Ref,
  shallowRef,
  triggerRef,
  watch,
} from "vue";

import { MANAGER } from "./renderer.js";
import { useReactive } from "./setup.js";

export function setupReactive<T>(blueprint: UseReactive<T>): Ref<ReadValue<T>> {
  return MANAGER.toNative(managerSetupReactive(MANAGER, blueprint));
}

export function setupResource<T>(intoBlueprint: IntoResourceBlueprint<T>): T {
  useReactive();

  const ref = shallowRef();

  const blueprint =
    typeof intoBlueprint === "function" ? intoBlueprint() : intoBlueprint;

  return effectScope().run(() => {
    const [scope, { sync, value }] = pushingScope(() => blueprint.setup());

    onMounted(() => {
      watch(ref, sync, { immediate: true });

      const unsubscribe = RUNTIME.subscribe(sync, () => void triggerRef(ref));

      onScopeDispose(() => {
        unsubscribe?.();
        finalize(scope);
      });
    });

    return value;
  }) as T;

  // return managerSetupResource(MANAGER, blueprint);
}

export function setupService<T>(blueprint: IntoResourceBlueprint<T>): T {
  useReactive();

  return managerSetupService(MANAGER, blueprint);
}
