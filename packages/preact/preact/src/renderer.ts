import type { InternalComponent } from "@starbeam/preact-utils";
import type {
  ComponentScheduler,
  Handler,
  RendererManager,
} from "@starbeam/renderer";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";

import { getCurrentComponent } from "./options.js";

export const MANAGER = {
  getComponent: () => getCurrentComponent(),
  setupValue: (_, create) => useMemo(create, []),
  setupRef: (_, value) => {
    const ref = useRef(value);
    ref.current = value;
    return ref;
  },
  createNotifier: () => {
    const [, setState] = useState({});
    return () => void setState({});
  },

  createScheduler: () => {
    const [state, setState] = useState({});

    const handlers = new Set<Handler>();

    useEffect(() => {
      for (const handler of handlers) {
        handler();
      }
    }, [state]);

    return {
      schedule: () => void setState({}),
      onSchedule: (handler) => void handlers.add(handler),
    } satisfies ComponentScheduler;
  },
  on: {
    layout: (component, handler) => void useLayoutEffect(handler),
    idle: (component, handler) => void useEffect(handler),
    mounted: (component, handler) => void useEffect(handler),
  },
} satisfies RendererManager<InternalComponent>;
