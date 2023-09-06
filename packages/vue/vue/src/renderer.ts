import type { Reactive } from "@starbeam/interfaces";
import type { RendererManager } from "@starbeam/renderer";
import { type Ref, shallowRef } from "vue";

import { useReactive } from "./setup.js";
import type { VueInstance } from "./vue-instance.js";

type VueRendererManager = RendererManager<
  VueInstance,
  <T>(reactive: Reactive<T>) => Ref<T>
>;

export const MANAGER: VueRendererManager = {
  getComponent: () => useReactive(),
  getApp: (component) => component.app,
  toNative: <T>(reactive: Reactive<T>): Ref<T> => {
    const vueInstance = useReactive();
    const ref = shallowRef(reactive.current);
    vueInstance.render(reactive, () => (ref.value = reactive.current));
    return ref;
  },
  setupValue: (_, create) => create(),
  setupRef: (_, value) => ({ current: value }),

  on: {
    idle: (component, handler) => void component.onMounted(handler),
    layout: (component, handler) => {
      component.onMounted(() => {
        const cleanup = handler();
      });
    },
  },
};
