import type { Reactive } from "@starbeam/interfaces";
import type { FormulaFn } from "@starbeam/reactive";
import {
  CachedFormula,
  Formula,
  isReactive,
  read,
  Static,
} from "@starbeam/reactive";
import type {
  Handler,
  Lifecycle,
  ReactiveBlueprint,
  SetupBlueprint,
  UseReactive,
} from "@starbeam/renderer";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { setupResource as starbeamSetupResource } from "@starbeam/resource";
import { pushingScope, RUNTIME } from "@starbeam/runtime";
import { finalize } from "@starbeam/shared";
import type { Ref } from "@starbeam/use-strict-lifecycle";
import {
  unsafeTrackedElsewhere,
  useLastRenderRef,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";
import { useEffect, useRef, useState } from "react";

import { useStarbeamApp } from "../app.js";
import { sameDeps } from "../utils.js";
import { buildLifecycle } from "./lifecycle.js";

/**
 * The `setup` function takes a setup function and runs it during the setup
 * phase.
 *
 * **Note**: The setup function may run multiple times if React re-runs the
 * render function with fresh component state. This happens most commonly in
 * strict mode, but it can also happen in the real world.
 */
export function setup<T>(blueprint: SetupBlueprint<T>): T {
  const app = useStarbeamApp({ allowMissing: true });

  return useLifecycle().render((builder) => {
    const lifecycle = buildLifecycle(builder, app);
    return blueprint(lifecycle);
  });
}

/**
 * The `setupReactive` function takes a reactive value or {@linkcode
 * ReactiveBlueprint} and returns a reactive value.
 *
 * If you pass a reactive value, the component will re-render whenever the
 * value changes. If you pass a {@linkcode ReactiveBlueprint}, this hook turns
 * it into a formula that evaluates the blueprint. In this case, the component
 * will re-render whenever the blueprint's dependencies change.
 */
export function setupReactive<T>(blueprint: UseReactive<T>): Reactive<T> {
  const [blueprintRef] = useLastRenderRef(blueprint);
  return createReactive(blueprintRef, undefined);
}

/**
 * The `useReactive` hook takes a reactive value or {@linkcode
 * ReactiveBlueprint}.
 *
 * - If you pass a `Reactive<T>`, `useReactive` returns a `T`
 * - If you pass a function that returns a `Reactive<T>`, `useReactive`
 *   returns a `T`
 *
 * This hook behaves like {@linkcode setupReactive}, except that it returns a
 * regular value rather than a reactive value.
 */

export function useReactive<T>(
  blueprint: ReactiveBlueprint<T>,
  deps: unknown[],
): T;
export function useReactive<T>(blueprint: Reactive<T>): T;
export function useReactive<T>(
  ...args:
    | [blueprint: Reactive<T>]
    | [blueprint: ReactiveBlueprint<T>, deps: unknown[]]
): T {
  const [blueprint, deps] = args;

  const [currentBlueprint] = useLastRenderRef(blueprint);
  const reactive = createReactive(currentBlueprint, deps);

  return unsafeTrackedElsewhere(() => reactive.read());
}

export function createReactive<T>(
  blueprint: Ref<UseReactive<T>>,
  deps?: unknown[],
): Reactive<T> {
  const app = useStarbeamApp({ allowMissing: true });

  return useLifecycle({
    validate: deps,
    with: sameDeps,
  }).render((builder) => {
    const lifecycle = buildLifecycle(builder, app);
    const { on, notify } = builder;
    const instance = setupFormula(blueprint, lifecycle);

    if (isReactive(instance)) {
      on.layout(() => void on.cleanup(RUNTIME.subscribe(instance, notify)));
      return instance;
    } else {
      return Static(instance);
    }
  });
}

export function setupFormula<T>(
  blueprint: Ref<UseReactive<T>>,
  lifecycle: Lifecycle,
): FormulaFn<T> {
  const constructed = CachedFormula(() =>
    isReactive(blueprint.current)
      ? blueprint.current
      : blueprint.current(lifecycle),
  );
  return Formula(() => read(constructed()));
}

export function setupService<T>(
  blueprint: IntoResourceBlueprint<T>,
): Reactive<T> {
  return setupReactive(({ service }) => service(blueprint));
}

export function setupResource<T>(blueprint: IntoResourceBlueprint<T>): T {
  return createResource(blueprint);
}

/**
 * A {@linkcode ScheduledHandler} is a function that is called in React's
 * `useEffect` timing.
 *
 * The `register` method registers the handler function, and the `schedule`
 * method schedules the handler to run in the next `useEffect`.
 */
interface ScheduledHandler {
  readonly register: (handler: Handler) => void;
  readonly schedule: () => void;
}

/**
 * Creates a {@linkcode ScheduledHandler} that will keep track of the
 * synchronization functions to run.
 *
 * This function sets up a `useEffect` to run the handlers. This `useEffect`
 * has a dependency on a `useState` that represents the set of handlers. The
 * `useState` invalidates whenever a handler is added or whenever
 * {@linkcode scheduleDep} is explicitly run.
 *
 * Importantly, handlers registered to the {@linkcode ScheduledHandler} are
 * always invoked in `useEffect` timing, which coordinates them with React's
 * scheduler.
 */
function useScheduledHandler(): ScheduledHandler {
  const [scheduleDep, setScheduleDep] = useState({});
  const handlerRef = useRef(null as null | Handler);

  useEffect(() => {
    if (handlerRef.current) handlerRef.current();
  }, [scheduleDep]);

  return {
    register: (handler) => (handlerRef.current = handler),
    schedule: () => void setScheduleDep({}),
  };
}

export function createResource<T>(
  blueprint: IntoResourceBlueprint<T>,
  deps?: unknown[],
): T {
  const [lastBlueprint] = useLastRenderRef(blueprint);

  const handler = useScheduledHandler();

  return useLifecycle({
    validate: deps,
    with: sameDeps,
  }).render((builder) => {
    // Set up the resource within a new finalization scope, which corresponds to
    // this render lifecycle. This runs the constructor and returns a sync
    // function that hasn't run yet.
    //
    // We'll run the sync function on layout. If we ran the sync function now,
    // we would not be guaranteed that its associated cleanup will run, since
    // React is allowed to run the render function multiple times without ever
    // running effects or cleanup.
    const [scope, { sync, value }] = pushingScope(() =>
      starbeamSetupResource(lastBlueprint.current),
    );

    builder.on.layout(() => {
      // Register the sync handler. This will schedule the sync immediately in
      // the `useEffect` created in `useScheduledHandler`.
      handler.register(sync);

      // Whenever the sync handler changes, schedule it. This will run sync
      // again in the `useEffect` created in `useScheduledHandler`.
      const unsubscribe = RUNTIME.subscribe(sync, handler.schedule);

      // When the component unmounts, clean up.
      builder.on.cleanup(() => {
        // Unsubscribe from notifications.
        if (unsubscribe) unsubscribe();

        // Finalize the scope that the resource was created inside.
        finalize(scope);

        // We don't need to do anything special with the handler ref because
        // `useEffect` won't run again unless the component is remounted and the
        // handler is set up again.
      });
    });

    return value;
  });
}
