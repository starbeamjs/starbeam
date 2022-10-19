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

import { type Description, Desc } from "@starbeam/debug";
import type { Reactive } from "@starbeam/timeline";
import { type Unsubscribe, LIFETIME, ReactiveCore } from "@starbeam/timeline";
import { isWeakKey } from "@starbeam/verify";

import { FormulaFn } from "../formula/formula.js";
import { Static } from "../static.js";

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

/**
 * {@linkcode ReactiveResource} is the stable value produced by instantiating a
 * {@linkcode ResourceFactory}.
 *
 * Its primary purpose is to present a stable reactive value that is nonetheless internally changing
 * quite a bit, and even getting cleaned up and reinitialized behind the scenes.
 */
export function Resource<T>(
  create: ResourceFactory<T>,
  description?: string | Description
): ResourceBlueprint<T> {
  const desc = Desc("resource", description);

  return new ResourceBlueprint((owner: object): Resource<T> => {
    const state = ResourceState.create(owner, create, desc);

    const reactiveConstructor = FormulaFn(
      () => state.next(),
      desc.detail("constructor")
    );

    let finalized = false;
    let instance: Resource<T> | undefined = undefined;

    // const instanceState = ResourceInstanceState(reactiveConstructor);

    const resource = FormulaFn(() => {
      if (instance && finalized) return instance;
      instance = brandResource(reactiveConstructor.read(), {
        hasLifetime: true,
      });
      return instance;
    }, desc.detail("instance"));

    const reactive = FormulaFn(
      () => resource.read().read(),
      desc.detail("value")
    );

    // Allow the user of the resource to finalize it by finalizing the returned resource.
    LIFETIME.link(reactive, state);

    LIFETIME.on.cleanup(owner, () => {
      finalized = true;
    });

    return brandResource(reactive, { hasLifetime: true });
  });
}

export class ResourceBlueprint<T> {
  #create: (owner: object) => Resource<T>;

  constructor(create: (owner: object) => Resource<T>) {
    this.#create = create;
  }

  create(owner: object): Resource<T> {
    return this.#create(owner);
  }

  root(): { resource: Resource<T>; owner: object } {
    const owner = Object.create(null);
    const resource = this.create(owner);
    return { resource, owner };
  }

  isResource(): this is ResourceBlueprint<T> {
    return true;
  }
}

export type ResourceReturn<T> = ResourceBlueprint<T> | ReactiveCore<T> | T;

export type ResourceFactory<T> = (resource: ResourceRun) => ResourceReturn<T>;

declare const RESOURCE: unique symbol;

const RESOURCES = new WeakMap<object, { hasLifetime: boolean }>();

function isResource<T>(value: ResourceReturn<T>): value is Resource<T>;
function isResource(value: unknown): value is Resource<unknown>;
function isResource<T>(value: unknown): value is Resource<T> {
  return !!(isWeakKey(value) && RESOURCES.get(value)?.hasLifetime);
}
function brandResource<T>(
  reactive: ReactiveCore<T>,
  options: { hasLifetime: boolean }
): Resource<T> {
  RESOURCES.set(reactive, options);
  return reactive as unknown as Resource<T>;
}
export interface Resource<T> extends Reactive<T> {
  [RESOURCE]: true;
}

type Handler = () => void | (() => void);

/**
 * The `ResourceState` is the state that is shared between all runs of a resource. A single resource
 * may invoke the resource constructor multiple times, but there is only a single `ResourceState`.
 */
class ResourceState<T> {
  static create<T>(
    owner: object,
    constructorFn: ResourceFactory<T>,
    desc: Description
  ): ResourceState<T> {
    const state = new ResourceState(desc, constructorFn);

    // Link the owner that was provided to `Resource.create()` to this `ResourceState`. Child
    // resources created using this resource's `use` will be linked to this resource state.
    LIFETIME.link(owner, state);

    return state;
  }

  readonly #desc: Description;
  readonly #constructorFn: ResourceFactory<T>;
  #currentRun: ResourceRun | undefined = undefined;

  constructor(desc: Description, constructorFn: ResourceFactory<T>) {
    this.#desc = desc;
    this.#constructorFn = constructorFn;
  }

  /**
   * Every time the resource constructor invalidates, this method is called to create a new
   * `ResourceRun` by re-invoking the resource constructor.
   *
   * It also finalizes the previous `ResourceRun`, once the new constructor has run. Any resources
   * that were used in the previous constructor and are used in the new constructor will be adopted
   * by the new constructor and not finalized.
   */
  next(): Resource<T> {
    const { prev, run } = this.#startNext();

    const value = run.use(this.#constructorFn(run));

    if (prev) {
      LIFETIME.finalize(prev);
    }

    return value;
  }

  #startNext() {
    const prev = this.#currentRun;
    const run = (this.#currentRun = new ResourceRun(
      this.#desc,
      this.#currentRun
    ));
    LIFETIME.link(this, run);

    return { prev, run };
  }
}

/**
 * A `ResourceRun` represents a single run of a resource constructor. Whenever the dependencies of
 * the previous run of the resource constructor change, a new `ResourceRun` is created and the
 * previous one is finalized.
 *
 * If a resource that was used in this run was also used in the previous run, it will be adopted by
 * the new run and not finalized.
 */
export class ResourceRun {
  readonly #desc: Description;
  readonly #prev: ResourceRun | undefined;

  constructor(desc: Description, prev: ResourceRun | undefined) {
    this.#desc = desc;
    this.#prev = prev;
  }

  readonly use = <T>(
    resource: ResourceReturn<T>,
    options?: { description?: string | Description | undefined }
  ): Resource<T> => {
    const desc = options?.description
      ? Desc("resource", options.description)
      : this.#desc.detail("use");

    if (isResource<T>(resource)) {
      if (this.#prev) LIFETIME.unlink(this.#prev, resource);
      LIFETIME.link(this, resource);
      return resource;
    } else if (ReactiveCore.is(resource)) {
      return brandResource(resource, { hasLifetime: false });
    } else if (resource instanceof ResourceBlueprint) {
      return resource.create(this);
    } else {
      return brandResource(Static(resource, desc), { hasLifetime: false });
      // verify(
      //   resource,
      //   hasType("function"),
      //   expected(`the value ${options?.cause ?? "passed to use"}`).toBe(
      //     `a reactive value, resource blueprint or resource constructor`
      //   )
      // );
      // return Resource(resource, this.#desc.detail("use")).create(this);
    }
  };

  readonly on = {
    cleanup: (handler: Handler): Unsubscribe => {
      return LIFETIME.on.cleanup(this, handler);
    },
  };
}
