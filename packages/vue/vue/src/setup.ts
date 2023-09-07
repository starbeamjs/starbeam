import { type App, type Plugin } from "vue";

import { useApp } from "./app.js";
import { VueComponent } from "./component.js";

export function useReactive(): VueComponent {
  return VueComponent.current();
}

export const Starbeam = {
  install: (app: App) => {
    useApp(app);
  },
} satisfies Plugin;
