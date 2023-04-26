import type { Lifecycle } from "@starbeam/renderer";
import { use } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import { type Builder } from "@starbeam/use-strict-lifecycle";

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
