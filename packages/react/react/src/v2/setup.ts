import type { Reactive } from "@starbeam/interfaces";
import {
  CachedFormula,
  Formula,
  type FormulaFn,
  isReactive,
  read,
  Static,
} from "@starbeam/reactive";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import {
  type Ref,
  unsafeTrackedElsewhere,
  useLastRenderRef,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { useStarbeamApp } from "../context-provider.js";
import { sameDeps } from "../use-resource.js";
import { buildLifecycle, type Lifecycle } from "./lifecycle.js";

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
type SetupBlueprint<T> = (lifecycle: Lifecycle) => T;

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
type ReactiveBlueprint<T> = (lifecycle: Lifecycle) => T | Reactive<T>;

/**
 * `UseReactive` describes the parameter that you can pass to {@linkcode setupReactive}
 * or {@linkcode useReactive}.
 */
type UseReactive<T> = ReactiveBlueprint<T> | Reactive<T>;

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
 * The `setupReactive` function takes a reactive value or {@linkcode ReactiveBlueprint}
 * and returns a reactive value.
 *
 * If you pass a reactive value, the component will re-render whenever the value changes.
 * If you pass a {@linkcode ReactiveBlueprint}, this hook turns it into a
 * formula that evaluates the blueprint. In this case, the component will re-render
 * whenever the blueprint's dependencies change.
 */
export function setupReactive<T>(blueprint: UseReactive<T>): Reactive<T> {
  const [blueprintRef] = useLastRenderRef(blueprint);
  return createReactive(blueprintRef, undefined);
}

/**
 * The `useReactive` hook takes a reactive value or {@linkcode ReactiveBlueprint}.
 *
 * - If you pass a `Reactive<T>`, `useReactive` returns a `T`
 * - If you pass a function that returns a `Reactive<T>`, `useReactive`
 *   returns a `T`
 *
 * This hook behaves like {@linkcode setupReactive}, except that it returns a
 * regular value rather than a reactive value.
 */

export function useReactive<T>(
  ...args:
    | [blueprint: Reactive<T>]
    | [blueprint: ReactiveBlueprint<T>, deps: unknown[]]
): T {
  const [blueprint, deps] = args;

  const [currentBlueprint] = useLastRenderRef(blueprint);
  const app = useStarbeamApp({ allowMissing: true });

  const reactive = useLifecycle({
    validate: deps,
    with: sameDeps,
  }).render((builder) => {
    const lifecycle = buildLifecycle(builder, app);
    // since we're in a use-style API, make the callback reactive: if the
    // callback consumes reactive state, we'll re-run it.
    const formula = Formula(() => {
      const current = currentBlueprint.current;
      return isReactive(current) ? read(current) : read(current(lifecycle));
    });

    builder.on.layout(
      () => void builder.on.cleanup(RUNTIME.subscribe(formula, builder.notify))
    );
    return formula;
  });
  return unsafeTrackedElsewhere(() => reactive.read());
}

function createReactive<T>(
  blueprint: Ref<UseReactive<T>>,
  deps?: unknown[]
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

function setupFormula<T>(
  blueprint: Ref<UseReactive<T>>,
  lifecycle: Lifecycle
): FormulaFn<T> {
  const constructed = CachedFormula(() =>
    isReactive(blueprint.current)
      ? blueprint.current
      : blueprint.current(lifecycle)
  );
  return Formula(() => read(constructed()));
}

export function setupService<T>(
  blueprint: IntoResourceBlueprint<T>
): Reactive<T> {
  return setupReactive(({ service }) => service(blueprint));
}

export function useService<T>(blueprint: IntoResourceBlueprint<T>): T {
  return useReactive(({ service }) => service(blueprint), []);
}

export function setupResource<T>(
  blueprint: IntoResourceBlueprint<T>
): Reactive<T> {
  return setupReactive(({ use }) => use(blueprint));
}

export function useResource<T>(blueprint: IntoResourceBlueprint<T>): T {
  return useReactive(({ use }) => use(blueprint), []);
}
