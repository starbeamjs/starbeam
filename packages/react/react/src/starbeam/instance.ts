import type { Reactive } from "@starbeam/interfaces";
import type { IntoResourceBlueprint, Resource } from "@starbeam/resource";

import type { Handlers, RegisterHandlers } from "./handlers.js";

export interface StarbeamInstance {
  readonly on: RegisterHandlers;
  readonly use: UseFn;
  readonly service: <T>(resource: IntoResourceBlueprint<T>) => Resource<T>;
}

export interface InternalStarbeamInstance extends StarbeamInstance {
  readonly deactivate: () => void;
  readonly reactivate: (lifecycle: Handlers) => void;
}

type PropagateUndefined<O> = O extends undefined ? undefined : never;

type UseFn = <T, O extends { initial?: T } | undefined>(
  resource: IntoResourceBlueprint<T>,
  options?: O,
) => Reactive<T | PropagateUndefined<O>>;
