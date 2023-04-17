import type { Reactive } from "@starbeam/interfaces";
import { CachedFormula, Cell } from "@starbeam/reactive";
import type { IntoResourceBlueprint, Resource } from "@starbeam/resource";
import { use as starbeamUse } from "@starbeam/resource";
import {  render,RUNTIME } from "@starbeam/runtime";
import { service as starbeamService } from "@starbeam/service";
import type { RegisterLifecycleHandlers } from "@starbeam/use-strict-lifecycle";
import { isPresent, verified } from "@starbeam/verify";

import { type ReactApp, verifiedApp } from "../context-provider.js";
import {
  type Callback,
  Handlers,
  invoke,
  onHandlers,
  type RegisterHandlers,
} from "./handlers.js";

export interface StarbeamInstance {
  readonly on: RegisterHandlers;
  readonly use: UseFn;
  readonly service: <T>(resource: IntoResourceBlueprint<T>) => Resource<T>;
}

export interface InternalStarbeamInstance extends StarbeamInstance {
  readonly deactivate: () => void;
  readonly reactivate: (lifecycle: Handlers) => void;
}

/**
 * Activates this Starbeam instance: creates a new one if it doesn't exist, or
 * reactivates an existing one if the component is being remounted.
 */
export function activate({
  starbeam,
  on,
  app,
  notify,
}: {
  starbeam: InternalStarbeamInstance | undefined;
  on: RegisterLifecycleHandlers<unknown>;
  app: ReactApp | null;
  notify: Callback;
}): InternalStarbeamInstance {
  const handlers = Handlers();
  if (starbeam) starbeam.reactivate(handlers);
  const instance = starbeam ?? StarbeamInstance(handlers, app, notify);

  setup({ on, handlers, instance });

  return instance;
}

/**
 * Sets up the lifecycle handlers for this Starbeam instance. If the component is
 * being remounted, the previous handlers were already cleaned up, so we need to
 * set up new ones.
 */
function setup({
  on,
  handlers,
  instance,
}: {
  on: RegisterLifecycleHandlers<unknown>;
  handlers: Handlers;
  instance: InternalStarbeamInstance;
}): void {
  on.idle(() => {
    invoke(handlers, "idle");
  });

  on.layout(() => {
    invoke(handlers, "layout");
  });

  on.cleanup(instance.deactivate);
}

export function StarbeamInstance(
  lifecycle: Handlers,
  app: ReactApp | null,
  notify: Callback
): InternalStarbeamInstance {
  let handlers: Handlers | null = lifecycle;

  function use<T, O extends { initial?: T } | undefined>(
    resource: IntoResourceBlueprint<T>,
    options?: O
  ): Reactive<T | PropagateUndefined<O>> {
    const resourceCell = Cell(undefined as Resource<T> | undefined);

    verified(handlers, isPresent).layout.add(() => {
      resourceCell.set(
        starbeamUse(resource, { lifetime: verified(handlers, isPresent) })
      );
      notify();
    });

    const formula = CachedFormula(
      () => resourceCell.current?.current ?? options?.initial
    );

    verified(handlers, isPresent).cleanup.add(() => render(formula, notify));

    return formula as Reactive<T>;
  }

  function deactivate() {
    if (handlers) {
      for (const callback of handlers.cleanup) callback();
      RUNTIME.finalize(handlers);
    }
    handlers = null;
  }

  return {
    on: onHandlers(() => verified(handlers, isPresent)),
    use,
    service: <T>(resource: IntoResourceBlueprint<T>): Resource<T> =>
      starbeamService(resource, { app: verifiedApp(app, "service") }),
    deactivate,
    reactivate: (newHandlers) => (handlers = newHandlers),
  };
}

type PropagateUndefined<O> = O extends undefined ? undefined : never;

type UseFn = <T, O extends { initial?: T } | undefined>(
  resource: IntoResourceBlueprint<T>,
  options?: O
) => Reactive<T | PropagateUndefined<O>>;
