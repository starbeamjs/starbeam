import type { Reactive } from "@starbeam/interfaces";
import type { Lifecycle, RendererManager } from "@starbeam/renderer";
import { use } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import {
  type Builder,
  useInstance,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { missingApp, ReactApp } from "../app.js";

/**
 * @internal
 *
 * The `buildLifecycle` function takes an internal builder from
 * `@starbeam/use-strict-lifecycle` and converts into the public API for
 * renderer lifecycles.
 */
export function buildLifecycle(
  builder: Builder<unknown>,
  app: ReactApp | null
): Lifecycle {
  return {
    service: (blueprint) => {
      if (app === null) missingApp("service()");

      return service(blueprint, {
        app: ReactApp.instance(app),
      });
    },
    use: (blueprint) => {
      const lifetime = {};
      builder.on.cleanup(() => void RUNTIME.finalize(lifetime));
      return use(blueprint, { lifetime });
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
  createInstance: (_, create) => useInstance(create),

  toNative: function <T>(reactive: Reactive<T>): Reactive<T> {
    return reactive;
  },
  on: {
    idle: (builder, handler): void => void builder.on.idle(handler),
    layout: (builder, handler): void => void builder.on.layout(handler),
  },
};
