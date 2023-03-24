/**
 * A Resource is a two-level formula:
 *
 * - The first formula is the "resource constructor". It is evaluated to produce
 *   the inner formula, and also has an opportunity to register finalizers and
 *   link children.
 * - The inner formula is a regular formula.
 *
 * Whenever any dependencies of the first formula invalidate, the associated
 * finalizers and children are finalized.
 *
 * The inner formula is stateless. This means it can be freely evaluated without
 * worrying about its lifetime.
 */

import { Desc, type Description } from "@starbeam/debug";
import type { Reactive } from "@starbeam/interfaces";
import { UNINITIALIZED } from "@starbeam/shared";
import { LIFETIME, Static } from "@starbeam/timeline";
import { isWeakKey } from "@starbeam/verify";

import { Formula } from "../formula/formula.js";
import type { IntoResource } from "../into.js";
import { type Blueprint, ReactiveBlueprint } from "../reactive.js";
import type { ResourceRun } from "./run.js";
import { ResourceState } from "./state.js";

export type ResourceFactory<T> =
  | ((resource: ResourceRun) => ResourceReturn<T>)
  | (new (resource: ResourceRun) => ResourceReturn<T>);

/**
 * {@linkcode ReactiveResource} is the stable value produced by instantiating a
 * {@linkcode ResourceFactory}.
 *
 * Its primary purpose is to present a stable reactive value that is nonetheless internally changing
 * quite a bit, and even getting cleaned up and reinitialized behind the scenes.
 */

// TODO: Pass the `initial` value into the resource constructor, if an `initial` value exists.

export function Resource<T, D extends undefined>(
  create: ResourceBlueprint<T, D>,
  description?: string | Description
): ResourceBlueprint<T, D>;
export function Resource<T>(
  create: ResourceFactory<T>,
  description?: string | Description
): ResourceBlueprint<T, undefined>;
export function Resource<T>(
  create: IntoResource<T>,
  description?: string | Description
): Blueprint<T, undefined>;
export function Resource<T>(
  create: IntoResource<T>,
  description?: string | Description
): Blueprint<T, undefined> {
  if (
    create instanceof ResourceBlueprint ||
    create instanceof ReactiveBlueprint
  ) {
    return create;
  }

  const desc = Desc("resource", description);

  return new ResourceBlueprint<T, undefined>(
    (owner, initial) => {
      // The resource state is shared between all runs of the resource. Each run is linked to it. The
      // state itself is linked to the owner, so that it will be cleaned up when the owner is cleaned up.
      const state = ResourceState.create(owner, create, initial, desc);

      LIFETIME.link(owner, state);

      return { state };
    },
    (run: ResourceRun, parent: ResourceState<unknown>, initial) => {
      {
        const state = ResourceState.create(parent, create, initial, desc);

        const resource = state.resource;

        // If the parent run is finalized, finalize the resource, if it is still owned by the
        // previous run. If it is adopted by a new run (which must have had the same parent
        // ResourceState), the `.link` call on the next line will cause the resource to be
        // adopted by the new run instead.
        LIFETIME.link(run, resource, { root: ResourceState.getOwner(parent) });

        return { state };
      }
    },
    Static(UNINITIALIZED)
  );
}

interface InternalBlueprintReturn<T> {
  state: ResourceState<T>;
}

export class ResourceBlueprint<T, _Default extends undefined = never> {
  static initial<T, Default extends undefined>(
    blueprint: ResourceBlueprint<T, Default>
  ): T | Default {
    const current = blueprint.#initial.current;

    return current === UNINITIALIZED ? (undefined as Default) : current;
  }

  #create: (
    owner: object,
    initial: Reactive<T | UNINITIALIZED>
  ) => InternalBlueprintReturn<T>;
  #initial: Reactive<T> | Reactive<UNINITIALIZED>;

  #use: (
    run: ResourceRun,
    parent: ResourceState<unknown>,
    initial: Reactive<T | UNINITIALIZED>
  ) => InternalBlueprintReturn<T>;

  constructor(
    create: (
      owner: object,
      initial: Reactive<T | UNINITIALIZED>
    ) => InternalBlueprintReturn<T>,
    use: (
      run: ResourceRun,
      parent: ResourceState<unknown>,
      initial: Reactive<T | UNINITIALIZED>
    ) => InternalBlueprintReturn<T>,
    initial: Reactive<T> | Reactive<UNINITIALIZED>
  ) {
    this.#create = create;
    this.#use = use;
    this.#initial = initial;
  }

  create(owner: object): Resource<T> {
    return this.#link(this.#create(owner, this.#initial));
  }

  use(run: ResourceRun, parent: ResourceState<unknown>): Resource<T> {
    return this.#link(this.#use(run, parent, this.#initial));
  }

  initial(value: () => T): ResourceBlueprint<T> {
    return new ResourceBlueprint(this.#create, this.#use, Formula(value));
  }

  #link({ state }: InternalBlueprintReturn<T>): Resource<T> {
    const resource = state.resource;
    LIFETIME.link(resource, state);
    return resource;
  }

  root(): { resource: Resource<T>; owner: object } {
    const owner = Object.create(null) as object;
    const resource = this.create(owner);
    return { resource, owner };
  }

  isResource(): this is ResourceBlueprint<T> {
    return true;
  }
}

export type ResourceReturn<T, D extends undefined = never> =
  | ResourceBlueprint<T, D>
  | Reactive<T>
  | T;

type ResourceReturnType<R extends ResourceReturn<unknown>> =
  R extends ResourceReturn<infer V> ? V : never;

export type AssimilatedResourceReturn<Ret extends ResourceReturn<unknown>> =
  Ret extends ResourceBlueprint<infer T>
    ? Resource<T> & Reactive<ResourceReturnType<Ret>>
    : Ret extends Reactive<infer T>
    ? Reactive<T> & Reactive<ResourceReturnType<Ret>>
    : Ret extends Reactive<infer T>
    ? Reactive<T & ResourceReturnType<Ret>>
    : Ret extends ResourceReturn<infer V>
    ? Reactive<V> & Reactive<V>
    : never;

declare const RESOURCE: unique symbol;

const RESOURCES = new WeakMap<object, { hasLifetime: boolean }>();

export function isResource<T>(value: ResourceReturn<T>): value is Resource<T> {
  return !!(isWeakKey(value) && RESOURCES.get(value)?.hasLifetime);
}

export function brandResource<T>(reactive: Reactive<T>): Resource<T> {
  RESOURCES.set(reactive, { hasLifetime: true });
  return reactive as unknown as Resource<T>;
}

export function brandReactiveResource<T>(reactive: Reactive<T>): Resource<T> {
  RESOURCES.set(reactive, { hasLifetime: false });
  return reactive as unknown as Resource<T>;
}

/**
 * A Resource instance is a stable value, but it has multiple possible internal layers of
 * invalidation.
 *
 * 1. The entire resource constructor can invalidate, which causes the resource to be cleaned up and
 *    the constructor to run again. If the resource is already set up, the setup function will run
 *    again once the resource is reinitialized.
 * 2. Setup handlers can invalidate, which causes their cleanups to run, and then for the setup
 *    handers to run again.
 * 3. The formula that represents the resource can invalidate, which simply causes the resource to
 *    invalidate.
 *
 * The trick of resources is providing a DSL that represents all of these three layers in a way that:
 *
 * 1. Naturally captures dependencies in all three layers.
 * 2. Provides a lexical structure that naturally gives access to longer lived values inside of
 *    shorter-lived closures (e.g. the long-lived cells that power a resource are in the outermost
 *    scope; they can be used inside of setup handlers, and variables created inside setup handlers
 *    are available inside cleanup handlers). The goal is to avoid introducing unnecessary nulls or
 *    forcing inner callbacks to mutate outer-scope variables that are initialized to null or
 *    undefined.
 */
export interface Resource<out T> extends Reactive<T> {
  [RESOURCE]: true;
}

export type Handler = (() => void) | (() => () => void);
