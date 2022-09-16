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

import type { Description } from "@starbeam/debug";
import { descriptionFrom } from "@starbeam/debug";
import { type Reactive, type Unsubscribe, LIFETIME } from "@starbeam/timeline";

import { FormulaFn } from "./formula.js";
import { Setups } from "./setups.js";

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
 * {@linkcode ResourceConstructor}.
 *
 * Its primary purpose is to present a stable reactive value that is nonetheless internally changing
 * quite a bit, and even getting cleaned up and reinitialized behind the scenes.
 */
export function Resource<T>(
  create: ResourceConstructor<T>,
  description?: string | Description
): ResourceBlueprint<T> {
  const desc = descriptionFrom({
    type: "resource",
    api: {
      package: "@starbeam/core",
      name: "Resource",
    },
    fromUser: description,
  });

  return {
    create({ owner }: { owner: object }) {
      const builder = new ResourceBuilder(Setups(desc.detail("setups")));
      const fn = create(builder);
      const resource = FormulaFn(() => {
        ResourceBuilder.validate(builder);
        return fn();
      }, desc);

      LIFETIME.link(owner, builder);
      LIFETIME.link(resource, builder);
      BUILDERS.set(resource, builder);

      return resource;
    },
  };
}

const BUILDERS = new WeakMap<Resource<unknown>, ResourceBuilder>();

Resource.setup = function <T>(resource: Resource<T>): void {
  const builder = BUILDERS.get(resource);

  if (builder) {
    ResourceBuilder.setup(builder);
  }
};

type ResourceConstructor<T> = (resource: ResourceBuilder) => () => T;

export interface Resource<T> extends Reactive<T> {
  readonly current: T;
}

export interface ResourceBlueprint<T> {
  create(options: { owner: object }): Resource<T>;
}

type Handler = () => void | (() => void);

export class ResourceBuilder {
  static setup(builder: ResourceBuilder): void {
    builder.#setups.setups();
    builder.#isSetup = true;
  }

  static validate(builder: ResourceBuilder): void {
    if (builder.#isSetup) {
      builder.#setups.setups();
    }
  }

  #isSetup = false;
  readonly #setups: Setups;

  constructor(setups: Setups) {
    this.#setups = setups;

    LIFETIME.link(this, setups);
  }

  readonly on = {
    setup: (
      handler: Handler,
      description?: Description | string
    ): Unsubscribe => {
      const desc = descriptionFrom({
        type: "formula",
        api: {
          package: "@starbeam/core",
          name: "ResourceBuilder",
          method: {
            name: "on.setup",
            type: "instance",
          },
        },
        fromUser: description,
      });

      return this.#setups.register(handler, desc);
    },
  };
}
