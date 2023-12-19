import type { RendererManager } from "@starbeam/renderer";
import { shallowRef, triggerRef, watch } from "vue";

import { Handlers } from "./bookkeeping.js";
import type { VueComponent } from "./component.js";
import { useReactive } from "./setup.js";

type VueRendererManager = RendererManager<VueComponent>;

export const MANAGER: VueRendererManager = {
  getComponent: () => useReactive(),
  getApp: (component) => component.app,
  setupValue: (_, create) => create(),
  setupRef: (_, value) => ({ current: value }),
  createNotifier: (component) => {
    return () => void component.notify();
  },
  createScheduler: () => {
    const ref = shallowRef();

    const handlers = new Handlers();

    watch(ref, () => void handlers.invoke());

    return {
      onSchedule: (handler) => void handlers.add(handler),
      schedule: () => void triggerRef(ref),
    };
  },

  on: {
    idle: (component, handler) => void component.on.layout(handler),
    layout: (component, handler) => void component.on.layout(handler),
    mounted: (component, handler) => void component.on.mounted(handler),
  },
};
