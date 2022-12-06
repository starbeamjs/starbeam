import type { Description } from "@starbeam/debug";
import { LIFETIME, TIMELINE } from "@starbeam/timeline";
import {
  type IntoResource,
  type Reactive,
  type ResourceBlueprint,
  Cell,
  Factory,
  Formula,
} from "@starbeam/universal";
import {
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { useNotify } from "./use-reactive.js";

export type UseFactory<T, D extends undefined> =
  | ResourceBlueprint<T, D>
  | (() => IntoResource<T>);

export function use<T, Initial extends undefined>(
  factory:
    | ResourceBlueprint<T, Initial>
    | (() => ResourceBlueprint<T, Initial>),
  dependencies?: unknown[]
): T | Initial;
export function use<T>(
  factory: ResourceBlueprint<T> | (() => ResourceBlueprint<T>),
  options: { initial: T; description?: string | Description | undefined }
): T;
export function use<T, Initial extends undefined>(
  factory: ResourceBlueprint<T> | (() => ResourceBlueprint<T, Initial>),
  options: { description?: string | Description | undefined }
): T | Initial;
export function use<T>(
  factory: IntoResource<T>,
  options?:
    | { initial?: T; description?: string | Description | undefined }
    | unknown[],
  dependencies?: unknown[]
): T | undefined {
  const value = createResource(
    factory as IntoResource<T | undefined>,
    options,
    dependencies
  );

  return unsafeTrackedElsewhere(() => value.current);
}

export function useResource<T, D extends undefined>(
  factory: () => ResourceBlueprint<T, D>,
  dependencies: unknown[]
): Reactive<T | D>;
export function useResource<T, D extends undefined>(
  factory: ResourceBlueprint<T, D>
): T | D;
export function useResource<T>(
  factory: IntoResource<T>,
  options?: { initial: T } | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  return createResource(factory, options, dependencies);
}

function createResource<T>(
  factory: IntoResource<T>,
  options?:
    | { initial?: T; description?: string | Description | undefined }
    | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  const notify = useNotify();

  const deps: unknown[] = Array.isArray(options) ? options : dependencies ?? [];
  const initialValue = Array.isArray(options) ? undefined : options?.initial;
  let prev: unknown[] = deps;

  let stable = {};

  return useLifecycle([deps, factory] as const, ({ on }) => {
    on.cleanup(() => {
      LIFETIME.finalize(stable);
    });

    const lastResource = new LastResource<T>(initialValue as T);

    // This function is called to instantiate the resource. It's called in two circumstances:
    //
    // 1. When the factory is first created, and
    // 2. When the dependencies change.
    //
    // The resource is never created during the initial render, because React can render the
    // component and never run effects. So we defer the creation of the resource until React commits
    // the component.
    //
    // React runs the render function twice in strict mode (without running effects or cleanup in
    // between). This means that any state that requires cleanup must be created in a React effect,
    // or it will leak.
    //
    // The resource is initially created in an effect (which guarantees that React will run its
    // cleanup function when the component is unmounted). When the resource's dependencies change,
    // we need to reset the resource. In that situation, we know that the component's
    // effects have already run, so we clean up the previous resource and create a new one in the
    // call to `use`.
    //
    // In practice, this means that `use` returns the initial value (which defaults to `undefined`)
    // during the initial render, but always returns the current value of the resource after that.
    function create(factory: IntoResource<T>): void {
      LIFETIME.finalize(stable);

      // Create the resource. The resource is created using the `stable` lifetime, which we
      // align with the component's lifecycle (below). This means that the resource will be
      // finalized when the component is unmounted (even temporarily).
      const created = lastResource.create((owner) =>
        Factory.resource(factory, owner)
      );

      stable = created.owner;

      // `value` is initialized below. It's a formula that returns the current value of the
      // resource (or its initial value). Whenever that value changes, we notify React.
      const unsubscribe = TIMELINE.on.change(value, () => {
        notify();
      });

      // When the component is unmounted, we unsubscribe from the resource's changes, so that
      // further changes don't notify React. This is mainly for hygiene, but it also prevents
      // unexpected leaks.
      LIFETIME.on.cleanup(stable, () => {
        unsubscribe();

        lastResource.didCleanup();
      });

      // Now that we've created the resource, we can notify React that the component has updated.
      // This gives the component a chance to render with the resource's actual value.
      notify();
    }

    on.layout(([_, factory]) => {
      create(factory);
    });

    on.update(([nextDeps, factory]) => {
      if (!sameDeps(prev, nextDeps) || lastResource.isInactive()) {
        prev = nextDeps;

        LIFETIME.finalize(stable);
        stable = {};
        create(factory);
      }
    });

    const value = Formula(() => {
      return lastResource.current;
    });

    return value;
  });
}

class LastResource<T> {
  readonly #initial: T;
  readonly #cell: Cell<Reactive<T | undefined> | undefined>;
  #value: Reactive<T | undefined> | undefined;
  #owner: object | undefined = undefined;

  constructor(initial: T) {
    this.#initial = initial;
    this.#cell = Cell(undefined as Reactive<T | undefined> | undefined);
    this.#value = undefined;
  }

  get current(): T {
    return this.#cell.current?.current ?? this.#initial;
  }

  isInactive(): boolean {
    return this.#value === undefined;
  }

  create(factory: (owner: object) => Reactive<T | undefined>): {
    reactive: Reactive<T | undefined>;
    owner: object;
  } {
    if (this.#owner) {
      LIFETIME.finalize(this.#owner);
    }

    const owner = (this.#owner = {});
    LIFETIME.link(this, owner);
    const reactive = factory(owner);
    this.#cell.set(reactive);
    this.#value = reactive;

    LIFETIME.link(owner, reactive);

    return { reactive, owner };
  }

  didCleanup(): void {
    this.#cell.set(undefined);
    this.#value = undefined;
    this.#owner = undefined;
  }
}

function sameDeps(
  prev: unknown[] | undefined,
  next: unknown[] | undefined
): boolean {
  if (prev === undefined || next === undefined) {
    return prev === next;
  }

  return (
    prev.length === next.length &&
    prev.every((value, index) => Object.is(value, next[index]))
  );
}
