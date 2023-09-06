import type { Reactive } from "@starbeam/interfaces";
import {
  CachedFormula,
  Formula,
  type FormulaFn,
  isReactive,
  read,
  type ReadValue,
} from "@starbeam/reactive";
import { setupResource } from "@starbeam/resource";
import { CONTEXT, RUNTIME, withinScope } from "@starbeam/runtime";
import { service } from "@starbeam/service";
import { shallowRef } from "vue";

import type { IntoResourceBlueprint } from "./resource.js";

/**
 * `SetupBlueprint` describes the parameter that you can pass to
 * {@linkcode setup}. It is a function that takes a {@linkcode Lifecycle}
 * and returns a value.
 *
 * In the simplest case, you can simply call setup with a function with no
 * parameters. The function will run during the setup phase, and return a stable
 * result for the lifetime of the component.
 *
 * You can also make use of the {@linkcode Lifecycle} to use resources, get
 * services or register code to run during the _idle_ or _layout_ phase.
 */
export type SetupBlueprint<T> = (lifecycle: Lifecycle) => T;

/**
 * `ReactiveBlueprint` is a function that takes a {@linkcode Lifecycle} and
 * returns an optionally reactive value. You can pass it to
 * {@linkcode useReactive} or {@linkcode setupReactive}. These functions will
 * instantiate the blueprint during the setup phase and return a stable reactive
 * value.
 *
 * If you pass a `ReactiveBlueprint` to {@linkcode useReactive}, you must also pass
 * dependencies to {@linkcode useReactive}. If the dependencies change, the
 * blueprint will re-evaluate, returning a new value.
 */
export type ReactiveBlueprint<T> = (lifecycle: Lifecycle) => T | Reactive<T>;

/**
 * `UseReactive` describes the parameter that you can pass to {@linkcode setupReactive}
 * or {@linkcode useReactive}.
 */
export type UseReactive<T> = ReactiveBlueprint<T> | Reactive<T>;

type ToNative = <T>(value: Reactive<T>) => unknown;
type DefaultToNative = <T>(value: Reactive<T>) => Reactive<T>;

export interface RendererManager<
  C extends object,
  T extends ToNative = DefaultToNative,
> {
  readonly toNative: T;
  readonly getComponent: () => C;
  readonly getApp?: (instance: C) => object | undefined;
  readonly setupValue: <T>(instance: C, create: () => T) => T;
  readonly setupRef: <T>(instance: C, value: T) => { readonly current: T };

  readonly on: {
    readonly idle: (instance: C, handler: Handler) => void;
    readonly layout: (instance: C, handler: Handler) => void;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SomeRendererManager = RendererManager<any, any>;

export interface Lifecycle {
  readonly on: {
    idle: (handler: Handler) => void;
    layout: (handler: Handler) => void;
  };

  readonly lifetime: object;
  readonly use: <T>(blueprint: IntoResourceBlueprint<T>) => T;
  readonly service: <T>(blueprint: IntoResourceBlueprint<T>) => T;
}

class LifecycleImpl implements Lifecycle {
  readonly #manager: SomeRendererManager;
  readonly #component: object;

  constructor(manager: SomeRendererManager, component: object) {
    this.#manager = manager;
    this.#component = component;
  }

  on = {
    idle: (handler: Handler): void =>
      void this.#manager.on.idle(this.#component, handler),
    layout: (handler: Handler): void =>
      void this.#manager.on.layout(this.#component, handler),
  };

  get lifetime(): object {
    return this.#manager.getComponent() as object;
  }

  use = <T>(blueprint: IntoResourceBlueprint<T>): T =>
    managerSetupResource(this.#manager, blueprint);

  service = <T>(blueprint: IntoResourceBlueprint<T>): T =>
    managerSetupService(this.#manager, blueprint);
}

interface UniversalRef<T> {
  readonly current: T;
}

export function managerSetupReactive<T, M extends SomeRendererManager>(
  manager: M,
  blueprint: UseReactive<T>,
): Reactive<ReadValue<T>> {
  const component = manager.getComponent() as object;
  const lifecycle = new LifecycleImpl(manager, component);
  const currentBlueprint = manager.setupRef(component, blueprint);
  return manager.setupValue(component, () =>
    setupFormula(currentBlueprint, lifecycle),
  );
}

export const managerCreateLifecycle = <M extends SomeRendererManager>(
  manager: M,
): Lifecycle => new LifecycleImpl(manager, manager.getComponent() as object);

export function setupFormula<T>(
  blueprint: UniversalRef<UseReactive<T>>,
  lifecycle: Lifecycle,
): FormulaFn<ReadValue<T>> {
  const constructed = CachedFormula(() =>
    isReactive(blueprint.current)
      ? blueprint.current
      : blueprint.current(lifecycle),
  );
  return Formula(() => read(constructed())) as FormulaFn<ReadValue<T>>;
}

function setupValue<T>(
  manager: SomeRendererManager,
  create: () => T,
): [component: object, value: T] {
  const component = manager.getComponent() as object;
  return [
    component,
    withinScope(component, () => manager.setupValue(component, create)) as T,
  ];
}

export function managerSetupResource<T>(
  manager: SomeRendererManager,
  blueprint: IntoResourceBlueprint<T>,
): T {
  const [component, { sync, value }] = setupValue(manager, () =>
    setupResource(blueprint),
  );

  const syncRef = shallowRef(0);

  component;

  manager.on.layout(component, () => {
    RUNTIME.subscribe(sync, () => void syncRef.value++);

    withinScope(component, sync);
  });

  return value;
}

export function managerSetupService<T>(
  manager: SomeRendererManager,
  intoBlueprint: IntoResourceBlueprint<T>,
): T {
  const component = manager.getComponent() as object;
  const app = manager.getApp?.(component) ?? CONTEXT.app;
  return manager.setupValue(component, () => {
    const blueprint =
      typeof intoBlueprint === "function" ? intoBlueprint() : intoBlueprint;

    return service(blueprint, { app });
  });
}

export type Handler = () => void;

export function runHandlers(handlers: Set<() => void>): void {
  handlers.forEach((handler) => void handler());
}
