import type { Reactive } from "@starbeam/interfaces";
import {
  Formula,
  type FormulaFn,
  isReactive,
  read,
  Static,
} from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";
import {
  type Ref,
  unsafeTrackedElsewhere,
  useLastRenderRef,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { sameDeps } from "../use-resource.js";
import { buildLifecycle, type Lifecycle } from "./lifecycle.js";

type ReactiveBlueprint<T> = (lifecycle: Lifecycle) => T | Reactive<T>;

/**
 * The `setup` function takes a setup function and runs it during the setup
 * phase.
 *
 * **Note**: The setup function may run multiple times if React re-runs the
 * render function with fresh component state. This happens most commonly in
 * strict mode, but it can also happen in the real world.
 */
export function setup<T>(blueprint: (lifecycle: Lifecycle) => T): T {
  return useLifecycle().render((builder) => {
    const lifecycle = buildLifecycle(builder);
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
export function setupReactive<T>(
  blueprint: Reactive<T> | ReactiveBlueprint<T>,
  deps?: unknown[]
): Reactive<T> {
  const [currentBlueprint] = useLastRenderRef(blueprint);

  return useLifecycle({
    validate: deps,
    with: sameDeps,
  }).render(({ on, notify }) => {
    // Since we're in a setup-style API, eagerly instantiate the callback.
    const instance = getInstance(currentBlueprint.current);

    if (isReactive(instance)) {
      on.layout(() => void on.cleanup(RUNTIME.subscribe(instance, notify)));
      return instance;
    } else {
      return Static(instance);
    }
  });
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
export function useReactive<T>(reactive: Reactive<T>): T;
export function useReactive<T>(
  blueprint: ReactiveBlueprint<T>,
  deps: unknown[]
): T;
export function useReactive<T>(
  blueprint: Reactive<T> | ReactiveBlueprint<T>,
  deps?: unknown[]
): T {
  const [currentBlueprint] = useLastRenderRef(blueprint);

  const reactive = useLifecycle({
    validate: deps,
    with: sameDeps,
  }).render((builder) => {
    const lifecycle = buildLifecycle(builder);
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

function getInstance<T>(
  blueprint: Reactive<T> | ReactiveBlueprint<T>
): T | Reactive<T> {
  return isReactive(blueprint) ? blueprint : blueprint();
}

function blueprintFormula<T>(
  blueprint: Ref<Reactive<T> | ReactiveBlueprint<T>>
): FormulaFn<T> {
  return Formula(() => {
    const current = blueprint.current;
    return isReactive(current) ? read(current) : read(current());
  });
}
