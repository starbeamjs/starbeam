import type { IntoResourceBlueprint, Resource } from "@starbeam/resource";
import { use } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import { type Builder } from "@starbeam/use-strict-lifecycle";

import { missingApp, ReactApp } from "../context-provider.js";

export type Handler = () => void;

/**
 *
 */
export interface Lifecycle {
  readonly use: <T>(blueprint: IntoResourceBlueprint<T>) => Resource<T>;
  readonly service: <T>(blueprint: IntoResourceBlueprint<T>) => Resource<T>;
  readonly on: {
    readonly idle: (handler: Handler) => void;
    readonly layout: (handler: Handler) => void;
  };
}

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
