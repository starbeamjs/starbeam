import type { InternalComponent } from "@starbeam/preact-utils";
import type { RendererManager } from "@starbeam/renderer";
import { useMemo } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export const MANAGER = {
  toNative: (reactive) => reactive,
  getComponent: () => getCurrentComponent(),
  createInstance: (_, create) => useMemo(create, []),
  on: {
    layout: (component, handler) => void component.on.layout(handler),
    idle: (component, handler) => void component.on.idle(handler),
  },
} satisfies RendererManager<InternalComponent>;
