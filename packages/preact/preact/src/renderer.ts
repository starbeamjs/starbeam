import type { Reactive } from "@starbeam/interfaces";
import type { InternalComponent } from "@starbeam/preact-utils";
import type { RendererManager } from "@starbeam/renderer";
import { useEffect, useLayoutEffect, useMemo, useRef } from "preact/hooks";

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
    layout: (component, handler) => void useLayoutEffect(handler),
    idle: (component, handler) => void useEffect(handler),
  },
} satisfies RendererManager<
  InternalComponent,
  <T>(reactive: Reactive<T>) => Reactive<T>
>;
