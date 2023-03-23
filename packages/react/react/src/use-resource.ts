import { Desc, type Description } from "@starbeam/debug";
import { LIFETIME, TIMELINE } from "@starbeam/timeline";
import {
  Cell,
  Factory,
  Formula,
  type IntoResource,
  type Reactive,
  type ResourceBlueprint,
  Wrap,
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
  options: { initial?: T; description?: string | Description | undefined },
  dependencies?: unknown[]
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

  const result = unsafeTrackedElsewhere(() => value.current);
  return result;
}

function createResource<T>(
  factory: IntoResource<T>,
  options?:
    | { initial?: T; description?: string | Description | undefined }
    | unknown[],
  dependencies?: unknown[]
): Reactive<T | undefined> {
  const notify = useNotify();

  function normalize(): {
    deps: unknown[];
    initialValue: T | undefined;
    description: string | Description | undefined;
  } {
    if (Array.isArray(options)) {
      return { deps: options, initialValue: undefined, description: undefined };
    } else {
      return {
        deps: dependencies ?? [],
        initialValue: options?.initial,
        description: options?.description,
      };
    }
  }

  const { deps, initialValue, description } = normalize();
  const desc = Desc("resource", description);

  // We pass `deps` and `factory` as the `useLifecycle` arguments. This means that `useLifecycle`
  // callbacks will receive up-to-date values for `deps` and `factory` when they're called. This
  // is especially important for `update`, which runs on every render: if the deps have changed in a
  // particular render, we need to use an up-to-date `factory` to create the resource.
  const cell = useLifecycle({ props: factory, validate: deps }).render<
    Cell<Reactive<T | undefined>>
  >(({ on, validate }, _, prev) => {
    const cell = prev ?? Cell(undefined as unknown);

    // Create a new instance of `LastResource` for this mount. It will remain stable until the
    // component is unmounted (even temporarily), at which point it will be finalized. This means
    // that **re***-renders, which call the `update` callback, will share the same `LastResource`
    // instance.
    const resource = MountedResource.create<T>(initialValue as T, desc);

    // When React unmounts the component (even temporarily), we finalize the resource.
    on.cleanup(() => {
      LIFETIME.finalize(resource);
    });

    // This function is called to instantiate the resource. It's called in two circumstances:
    //
    // 1. When the factory is first created, and
    // 2. When the dependencies change.
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
      // Create the resource. The resource is created with the `lastResource` as its owner. This
      // means that the resource will be finalized when `lastResource` is finalized, which happens
      // (above) when the component is unmounted.
      resource.create((owner) => Factory.resource(factory, owner));

      // `value` is initialized below. It's a formula that returns the current value of the
      // resource (or its initial value). Whenever that value changes, we notify React.
      const unsubscribe = TIMELINE.on.change(resource, () => {
        notify();
      });

      // When the resource is finalized (because the component is unmounted, even temporarily), we
      // unsubscribe from the resource's changes. This is largely for hygiene, but it also prevents
      // us from (unnecessarily) notifying React after the component has been unmounted.
      //
      // If the component is remounted, we'll get a whole new `useLifecycle` instance, which will
      // create a new `lastResource` and a new `value` formula. TL;DR From the perspective of this
      // code, "mounting" and "remounting" are the same thing.
      LIFETIME.on.cleanup(resource, unsubscribe);

      // Now that we've created the resource, we can notify React that the component has updated.
      // Since we haven't yet consumed the `value` formula, it doesn't yet have any dependencies.
      // Notifying React will cause React to run the component's render function again, which will
      // consume the `value` formula (and keep it up to date).
      notify();
    }

    // When the component is first rendered, we wait until React commits the component to create the
    // resource. This is because React can render the component and never run effects. So we defer
    // the creation of the resource until React commits the component.
    on.layout((factory) => {
      create(factory);
    });

    validate(sameDeps);

    cell.set(resource);
    return cell as Cell<Reactive<T | undefined>>;
  });

  return unsafeTrackedElsewhere(() => cell.current);
}

export class MountedResource<T> {
  static create<T>(
    initial: T,
    description: Description
  ): MountedResource<T> & Reactive<T | undefined> {
    const resource = new MountedResource(initial, description);
    return Wrap(resource.formula, resource);
  }

  readonly formula: Formula<T | undefined>;
  readonly #initial: T;
  readonly #cell: Cell<Reactive<T | undefined> | undefined>;
  #value: Reactive<T | undefined> | undefined;
  #owner: object | undefined = undefined;

  private constructor(initial: T, description: Description) {
    this.#initial = initial;
    this.#cell = Cell(undefined as Reactive<T | undefined> | undefined, {
      description: description.implementation("target"),
    });
    this.#value = undefined;
    this.formula = Formula(
      () => this.#cell.current?.current ?? this.#initial,
      description.implementation("formula")
    );

    LIFETIME.on.cleanup(this, () => {
      this.#finalize();
    });
  }

  #finalize(): void {
    if (this.#owner) {
      LIFETIME.finalize(this.#owner);
      this.#owner = undefined;
    }
  }

  #reset(): object {
    this.#finalize();

    this.#owner = {};
    LIFETIME.link(this, this.#owner);
    return this.#owner;
  }

  isInactive(): boolean {
    return this.#value === undefined;
  }

  create(factory: (owner: object) => Reactive<T | undefined>): {
    reactive: Reactive<T | undefined>;
    owner: object;
  } {
    const owner = this.#reset();

    const reactive = factory(owner);

    this.#cell.set(reactive);
    this.#value = reactive;

    // If the `use`d resource is finalized, and the return value of the factory is a resource, we
    // want to finalize that resource as well.
    LIFETIME.link(this, reactive);

    return { reactive, owner };
  }
}

export function sameDeps(
  prev: unknown[] | undefined,
  next: unknown[] | undefined
): boolean {
  if (prev === undefined || next === undefined) {
    return prev === next;
  }

  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((value, index) => Object.is(value, next[index]));
}
