import type { Reactive } from "@starbeam/interfaces";
import { CachedFormula, Cell } from "@starbeam/reactive";
import type { IntoResourceBlueprint, Resource } from "@starbeam/resource";
import { use as starbeamUse } from "@starbeam/resource";
import { LIFETIME, PUBLIC_TIMELINE } from "@starbeam/runtime";
import { service as starbeamService } from "@starbeam/service";
import type { RegisterLifecycleHandlers } from "@starbeam/use-strict-lifecycle";
import { isPresent, verified } from "@starbeam/verify";

import { missingApp, type ReactApp } from "../context-provider.js";
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
  readonly reactivate: (lifecycle: Handlers) => InternalStarbeamInstance;
}

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
  const instance = starbeam
    ? starbeam.reactivate(handlers)
    : StarbeamInstance(handlers, app, notify);

  setup({ on, handlers, instance });

  return instance;
}

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

  function service<T>(resource: IntoResourceBlueprint<T>): Resource<T> {
    if (!app) missingApp("useStarbeam");
    return starbeamService(resource, { app });
  }

  const use = useFn(() => verified(handlers, isPresent), notify);

  function deactivate() {
    if (handlers) {
      for (const callback of handlers.cleanup) callback();
      LIFETIME.finalize(handlers);
    }
    handlers = null;
  }

  function reactivate(lifecycle: Handlers): InternalStarbeamInstance {
    handlers = lifecycle;
    return instance;
  }

  const instance = {
    on: onHandlers(() => verified(handlers, isPresent)),
    use,
    service,
    deactivate,
    reactivate,
  } satisfies InternalStarbeamInstance;

  return instance;
}

type PropagateUndefined<O> = O extends undefined ? undefined : never;

type UseFn = <T, O extends { initial?: T } | undefined>(
  resource: IntoResourceBlueprint<T>,
  options?: O
) => Reactive<T | PropagateUndefined<O>>;

function useFn(handlers: () => Handlers, notify: Callback): UseFn {
  function use<T, O extends { initial?: T } | undefined>(
    resource: IntoResourceBlueprint<T>,
    options?: O
  ): Reactive<T | PropagateUndefined<O>> {
    const resourceCell = Cell(undefined as Resource<T> | undefined);

    handlers().layout.add(() => {
      resourceCell.set(starbeamUse(resource, { lifetime: handlers }));
      notify();
    });

    const formula = CachedFormula(
      () => resourceCell.current?.current ?? options?.initial
    );

    handlers().cleanup.add(() => {
      PUBLIC_TIMELINE.on.change(formula, notify);
    });

    return formula as Reactive<T>;
  }

  return use;
}
