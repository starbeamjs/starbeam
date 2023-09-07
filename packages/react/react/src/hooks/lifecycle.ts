import { getFirst } from "@starbeam/core-utils";
import {
  intoResourceBlueprint,
  type Lifecycle,
  type RendererManager,
} from "@starbeam/renderer";
import { RUNTIME } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import { finalize } from "@starbeam/shared";
import {
  type Builder,
  useInstance,
  useLastRenderRef,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

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
      const resource = setupResource(() => intoResourceBlueprint(blueprint));

      builder.on.layout(() => {
        const unsubscribe = RUNTIME.subscribe(resource, builder.notify);
        builder.on.cleanup(unsubscribe);

        setup(resource, { lifetime: builder });
        builder.on.cleanup(() => void finalize(builder));
      });

      return resource;
    },
    on: {
      idle: builder.on.idle,
      layout: builder.on.layout,
    },
  };
}

export const MANAGER: RendererManager<Builder<unknown>> = {
  toNative: (reactive) => reactive,
  getComponent: () => {
    return useLifecycle().render((builder) => builder);
  },
  setupValue: (_, create) => useInstance(create),
  setupRef: (_, prop) => getFirst(useLastRenderRef(prop)),

  on: {
    idle: (builder, handler): void => void builder.on.idle(handler),
    layout: (builder, handler): void => void builder.on.layout(handler),
  },
};
