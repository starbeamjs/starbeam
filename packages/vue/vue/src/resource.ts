import type { ReadValue } from "@starbeam/reactive";
import type { UseReactive } from "@starbeam/renderer";
import {
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
} from "@starbeam/renderer";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { setupResource as setupStarbeamResource } from "@starbeam/resource";
import { pushingScope, RUNTIME } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import type { Directive, Ref, ShallowRef } from "vue";
import { nextTick, shallowRef, triggerRef } from "vue";

import { MANAGER } from "./renderer.js";
import { useReactive } from "./setup.js";

export type ElementResourceBlueprint<E extends Element, T> = (
  element: E,
) => IntoResourceBlueprint<T>;

export interface ElementResourceDirectiveOptions<T> {
  readonly into?: Ref<T | null> | undefined;
}

export type ElementResourceHandle<
  E extends Element = Element,
  T = unknown,
> = ShallowRef<T | null> & {
  readonly directive: Directive<E>;
};

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

export function elementResourceDirective<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  options: ElementResourceDirectiveOptions<T> = {},
): Directive<E> {
  const cleanups = new WeakMap<E, () => void>();

  const publish = (value: T | null): void => {
    if (!options.into) return;

    options.into.value = value;
    triggerRef(options.into);
  };

  return {
    mounted(element) {
      cleanups.get(element)?.();

      const [scope, resource] = pushingScope(() =>
        setupStarbeamResource(blueprint(element)),
      );

      resource.sync();
      publish(resource.value);

      let scheduled = false;
      let active = true;
      const scheduleSync = () => {
        if (scheduled) return;
        scheduled = true;

        void nextTick(() => {
          scheduled = false;
          if (!active) return;
          resource.sync();
          publish(resource.value);
        });
      };

      const unsubscribe = RUNTIME.subscribe(resource.sync, scheduleSync);

      cleanups.set(element, () => {
        active = false;
        if (unsubscribe) unsubscribe();
        finalize(scope);
        publish(null);
      });
    },

    unmounted(element) {
      cleanups.get(element)?.();
      cleanups.delete(element);
    },
  };
}

export function elementResource<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
): ElementResourceHandle<E, T> {
  const value: ShallowRef<T | null> = shallowRef<T | null>(null);

  return Object.assign(value, {
    directive: elementResourceDirective(blueprint, { into: value }),
  });
}
