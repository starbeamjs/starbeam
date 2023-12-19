import { getFirst } from "@starbeam/core-utils";
import type { Handler, Lifecycle, RendererManager } from "@starbeam/renderer";
import { intoResourceBlueprint } from "@starbeam/renderer";
import { service } from "@starbeam/service";
import type { Builder } from "@starbeam/use-strict-lifecycle";
import {
  useInstance,
  useLastRenderRef,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";
import { useEffect, useRef, useState } from "react";

import { missingApp, ReactApp } from "../app.js";
import { setupResource } from "./setup.js";

/**
 * @internal
 *
 * The `buildLifecycle` function takes an internal builder from
 * `@starbeam/use-strict-lifecycle` and converts into the public API for
 * renderer lifecycles.
 */
export function buildLifecycle(
  builder: Builder<unknown>,
  app: ReactApp | null,
): Lifecycle {
  return {
    get lifetime() {
      return builder;
    },

    service: (blueprint) => {
      if (app === null) missingApp("service()");

      return service(intoResourceBlueprint(blueprint), {
        app: ReactApp.instance(app),
      });
    },
    use: (blueprint) => {
      return setupResource(() => intoResourceBlueprint(blueprint));
    },
    on: {
      idle: builder.on.idle,
      layout: builder.on.layout,
    },
  };
}

export const MANAGER: RendererManager<Builder<unknown>> = {
  getComponent: () => {
    return useLifecycle().render((builder) => builder);
  },
  setupValue: (_, create) => useInstance(create),
  setupRef: (_, prop) => getFirst(useLastRenderRef(prop)),

  createNotifier: (builder) => {
    return builder.notify;
  },

  createScheduler: (builder) => {
    const [shouldNotify, setShouldNotify] = useState({});
    const handlers = useRef(new Set<Handler>());

    useEffect(() => {
      for (const handler of handlers.current) {
        handler();
      }
    }, [shouldNotify]);

    builder.on.cleanup(() => {
      handlers.current.clear();
    });

    return {
      onSchedule: (handler) => {
        handlers.current.add(handler);
      },
      schedule: () => {
        setShouldNotify({});
      },
    };
  },

  on: {
    mounted: (builder, handler): void => void builder.on.idle(handler),
    idle: (builder, handler): void => void builder.on.idle(handler),
    layout: (builder, handler): void => void builder.on.layout(handler),
  },
};
