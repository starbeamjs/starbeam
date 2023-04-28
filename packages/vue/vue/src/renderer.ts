import type { Reactive } from "@starbeam/interfaces";
import type { RendererManager } from "@starbeam/renderer";
import { type Ref, shallowRef } from "vue";

import { useReactive } from "./setup.js";
import type { VueInstance } from "./vue-instance.js";

interface VueRendererManager extends RendererManager<VueInstance> {
  toNative: <T>(reactive: Reactive<T>) => Ref<T>;
}

export const MANAGER: VueRendererManager = {
  getComponent: () => useReactive(),
  getApp: (component) => component.app,
  toNative: <T>(reactive: Reactive<T>): Ref<T> => {
    const vueInstance = useReactive();
    const ref = shallowRef(reactive.current);
    vueInstance.render(reactive, () => (ref.value = reactive.current));
    return ref;
  },
  createInstance: (_, create) => create(),

  on: {
    idle: (component, handler) => void component.onMounted(handler),
    layout: (component, handler) => void component.onMounted(handler),
  },
};
