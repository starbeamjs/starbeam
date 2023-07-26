import type { Reactive } from "@starbeam/interfaces";
import type { InternalComponent } from "@starbeam/preact-utils";
import type { RendererManager } from "@starbeam/renderer";
import { useMemo, useRef } from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export const MANAGER = {
  toNative: (reactive) => reactive,
  getComponent: () => getCurrentComponent(),
  setupValue: (_, create) => useMemo(create, []),
  setupRef: (_, value) => {
    const ref = useRef(value);
    ref.current = value;
    return ref;
  },
  on: {
    layout: (component, handler) => void component.on.layout(handler),
    idle: (component, handler) => void component.on.idle(handler),
  },
} satisfies RendererManager<
  InternalComponent,
  <T>(reactive: Reactive<T>) => Reactive<T>
>;
