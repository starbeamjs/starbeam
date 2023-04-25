import type { IntoResourceBlueprint, Resource } from "@starbeam/resource";
import { use } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import { type Builder, useLifecycle } from "@starbeam/use-strict-lifecycle";

export type Handler = () => void;

export interface Lifecycle {
  readonly use: <T>(blueprint: IntoResourceBlueprint<T>) => Resource<T>;
  readonly on: {
    readonly idle: (handler: Handler) => void;
    readonly layout: (handler: Handler) => void;
  };
}

export function Lifecycle(): Lifecycle {
  return useLifecycle().render((builder) => buildLifecycle(builder));
}

export function buildLifecycle(builder: Builder<unknown>): Lifecycle {
  return {
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
