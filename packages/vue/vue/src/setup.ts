import { type App, type Plugin } from "vue";

import { useApp } from "./app.js";
import { VueInstance } from "./vue-instance.js";

export function useReactive(): VueInstance {
  return VueInstance.ensure();
}

export const Starbeam = {
  install: (app: App) => {
    useApp(app);
  },
} satisfies Plugin;
