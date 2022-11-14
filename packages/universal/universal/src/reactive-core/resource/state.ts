import type { Description } from "@starbeam/debug";
import type { Reactive } from "@starbeam/interfaces";
import { UNINITIALIZED } from "@starbeam/shared";
import { LIFETIME, ReactiveCore } from "@starbeam/timeline";

import { Formula } from "../formula/formula.js";
import { Static } from "../static.js";
import {
  type AssimilatedResourceReturn,
  type Resource,
  type ResourceFactory,
  type ResourceReturn,
  brandResource,
  isResource,
  ResourceBlueprint,
} from "./resource";
import { ResourceRun } from "./run";

/**
 * The `ResourceState` is the state that is shared between all runs of a resource. A single resource
 * may invoke the resource constructor multiple times, but there is only a single `ResourceState`.
 */
export class ResourceState<T> {
  static getOwner(state: ResourceState<unknown>): object {
    return state.#owner;
  }

  static create<T>(
    owner: object,
    constructorFn: ResourceFactory<T>,
    initial: Reactive<T | UNINITIALIZED>,
    desc: Description
  ): ResourceState<T> {
    function construct(run: ResourceRun): ResourceReturn<T> {
      try {
        return (
          constructorFn as Extract<
            ResourceFactory<T>,
            (run: ResourceRun) => unknown
          >
        )(run);
      } catch (e) {
        if (e instanceof TypeError && /class constructor/i.exec(e.message)) {
          return new (constructorFn as Extract<
            ResourceFactory<T>,
            new (run: ResourceRun) => unknown
          >)(run);
        } else {
          throw e;
        }
      }
    }

    const state = new ResourceState(desc, construct, initial, owner);

    return state;
  }

  readonly #desc: Description;
  readonly #constructorFn: (resource: ResourceRun) => ResourceReturn<T>;
  readonly #owner: object;
  #currentRun: ResourceRun | undefined = undefined;
  readonly reactiveConstructor: Reactive<ReactiveCore<T>>;
  readonly reactiveInstance: Reactive<ReactiveCore<T>>;
  readonly resource: Resource<T>;

  constructor(
    desc: Description,
    constructorFn: (resource: ResourceRun) => ResourceReturn<T>,
    initial: Reactive<T | UNINITIALIZED>,
    owner: object
  ) {
    this.#desc = desc;
    this.#constructorFn = constructorFn;
    this.#owner = owner;

    this.reactiveConstructor = Formula(
      () => this.next(),
      desc.detail("constructor")
    );

    let instance: ReactiveCore<T> | undefined = undefined;
    let finalized = false;

    LIFETIME.on.cleanup(owner, () => {
      finalized = true;
    });

    this.reactiveInstance = Formula(() => {
      if (instance && finalized) return instance;

      instance = this.reactiveConstructor.read();
      return instance;
    }, desc.detail("instance"));

    this.resource = brandResource(
      Formula(
        () => this.reactiveInstance.read().read(),
        desc.detail("instance")
      )
    );
  }

  /**
   * Every time the resource constructor invalidates, this method is called to create a new
   * `ResourceRun` by re-invoking the resource constructor.
   *
   * It also finalizes the previous `ResourceRun`, once the new constructor has run. Any resources
   * that were used in the previous constructor and are used in the new constructor will be adopted
   * by the new constructor and not finalized.
   */
  next(): ReactiveCore<T> {
    return this.#startNextRun((nextRun) => {
      // Run the constructor function with the *new run*. We haven't yet finalized the previous run,
      // so the constructor function has an opportunity to use any resources that were used in the
      // previous run.
      const returnValue = this.#constructorFn(nextRun);

      // Assimilate the return value into a resource.
      //
      // If the return value is a resource, we link it to the new run. It will get finalized when
      // the new run is finalized, unless it is adopted by the new run.
      //
      // If the return value is a blueprint, we use it to create a new resource, which we then link
      // to the new run. In this case, the blueprint will be finalized when the new run is
      // finalized, as there is no way for the blueprint to be adopted by the new run.
      return this.assimilateResourceReturn({
        resource: returnValue,
        nextRun,
        desc: this.#desc,
      }) as ReactiveCore<T>;
    });
  }

  #startNextRun<T>(
    callback: (run: ResourceRun) => ReactiveCore<T>
  ): ReactiveCore<T> {
    const prevRun = this.#currentRun;

    const nextRun = new ResourceRun(
      this.#owner,
      this as ResourceState<unknown>,
      this.#desc
    );
    this.#currentRun = nextRun;

    LIFETIME.link(this, nextRun);

    // We run the callback *before* we finalize the previous run, so that any resources that are
    // used in the new run are adopted by the new run and therefore not finalized.
    const result = callback(nextRun);

    prevRun && LIFETIME.finalize(prevRun);

    return result;
  }

  assimilateResourceReturn<R extends ResourceReturn<T>, T>({
    resource,
    nextRun,
    desc,
  }: {
    resource: R;
    nextRun: ResourceRun;
    desc: Description;
  }): AssimilatedResourceReturn<R> {
    if (isResource(resource)) {
      LIFETIME.link(nextRun, resource, { root: this.#owner });
      return resource as AssimilatedResourceReturn<R>;
    } else if (ReactiveCore.is(resource)) {
      return resource as AssimilatedResourceReturn<R>;
    } else if (resource instanceof ResourceBlueprint) {
      return resource.use(nextRun, this) as AssimilatedResourceReturn<R>;
    } else if (resource === UNINITIALIZED) {
      return Static(undefined) as AssimilatedResourceReturn<R>;
    } else {
      return Static(
        resource,
        desc.detail("return")
      ) as AssimilatedResourceReturn<R>;
    }
  }
}
