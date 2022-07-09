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

import {
  type Description,
  type Stack,
  callerStack,
  descriptionFrom,
  DisplayStruct,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ifDebug,
  INSPECT,
} from "@starbeam/debug";
import {
  type ReactiveInternals,
  type Unsubscribe,
  LIFETIME,
  REACTIVE,
} from "@starbeam/timeline";
import { expected, isEqual, verify } from "@starbeam/verify";

import type { Reactive } from "../../reactive.js";
import { Formula } from "./formula.js";
import { FormulaState } from "./state.js";

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
class ReactiveResource<T> implements Reactive<T> {
  static setup<T>(this: void, resource: Resource<T>, caller: Stack): void {
    resource.#built.setup(caller);
  }

  static reinitialize(
    this: void,
    resource: Resource<unknown>,
    caller: Stack
  ): void {
    return resource.#reinitialize(caller);
  }

  readonly #description: Description;
  readonly #initializer: (caller: Stack) => InitializedResource<T>;
  #built: BuiltResource;
  #constructorFormula: FormulaState<unknown>;
  #formula: Formula<T>;

  constructor(
    built: BuiltResource,
    initializer: (caller: Stack) => InitializedResource<T>,
    constructorFormula: FormulaState<unknown>,
    formula: Formula<T>,
    description: Description
  ) {
    this.#built = built;
    this.#initializer = initializer;
    this.#constructorFormula = constructorFormula;
    this.#formula = formula;
    this.#description = description;

    LIFETIME.link(this, built);
  }

  @ifDebug
  [INSPECT]() {
    return DisplayStruct("ReactiveResource", {
      description: this.#description.describe(),
    });
  }

  get current(): T {
    return this.read(callerStack());
  }

  read(caller: Stack): T {
    if (this.#constructorFormula.isValid()) {
      // If the constructor function is valid, poll the setup handlers. If a setup handler is
      // invalid, finalize it and run it again.
      this.#built.poll(caller);
    } else {
      this.#reinitialize(caller);
    }

    // Now that we've revalidated the formula, get the current value.
    return this.#formula.current;
  }

  #reinitialize(caller: Stack) {
    LIFETIME.finalize(this.#built);

    const { built, constructorFormula, formula } = this.#initializer(caller);

    this.#built = built;
    LIFETIME.link(this, built);

    this.#constructorFormula = constructorFormula;
    this.#formula = formula;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#formula[REACTIVE];
  }
}

interface InitializedResource<T> {
  built: BuiltResource;
  constructorFormula: FormulaState<unknown>;
  formula: Formula<T>;
}

/**
 * This the public API passed into the {@linkcode Resource} function. It is created every time the
 * constructor formula is invalidated, in order to produce a new instance of {@linkcode BuiltResource}.
 */
class ResourceBuilder {
  static build<T>(
    constructorFn: ResourceConstructor<T>,
    description: Description,
    caller: Stack
  ): Resource<T> {
    const { built, constructorFormula, formula } = ResourceBuilder.initialize(
      constructorFn,
      description,
      caller
    );

    return new ReactiveResource(
      built,
      (caller) =>
        ResourceBuilder.initialize(constructorFn, description, caller),
      constructorFormula,
      formula,
      description
    );
  }

  static initialize<T>(
    constructor: ResourceConstructor<T>,
    description: Description,
    caller: Stack
  ): InitializedResource<T> {
    const builder = new ResourceBuilder(description);
    const constructorFormula = FormulaState.evaluate(
      () => constructor(builder),
      description.key("constructor"),
      caller
    );

    const formula = Formula(constructorFormula.value, description);

    return {
      built: builder.#built(),
      constructorFormula: constructorFormula.state,
      formula,
    };
  }

  readonly #setups: Set<RegisteredSetup> = new Set();
  readonly #description: Description;

  constructor(description: Description) {
    this.#description = description;
  }

  on = {
    setup: (callback: () => () => void): Unsubscribe => {
      const handler = new RegisteredSetup(callback, this.#description);
      this.#setups.add(handler);

      return () => {
        this.#setups.delete(handler);
      };
    },
  };

  #built(): BuiltResource {
    return new BuiltResource(this.#setups);
  }
}

class BuiltResource {
  readonly #setups: Set<RegisteredSetup>;

  constructor(setups: Set<RegisteredSetup>) {
    this.#setups = setups;

    LIFETIME.on.cleanup(this, () => {
      for (const setup of setups) {
        LIFETIME.finalize(setup);
      }
    });
  }

  setup(caller: Stack) {
    for (const setup of this.#setups) {
      LIFETIME.link(this, setup);
      setup.run(caller);
    }
  }

  /**
   * Once we've validated the constructor itself, revalidate setup handlers.
   *
   * For each handler, if the setup function is invalid, run its cleanup function and then run its
   * setup function again.
   */
  poll(caller: Stack) {
    for (const setup of this.#setups) {
      setup.poll(caller);
    }
  }
}

class RegisteredSetup {
  #setup: () => () => void;
  #active: FormulaState<() => void> | undefined = undefined;
  #description: Description;

  constructor(setup: () => () => void, description: Description) {
    this.#setup = setup;
    this.#description = description;

    LIFETIME.on.cleanup(this, () => {
      if (this.#active) {
        const cleanup = FormulaState.lastValue(this.#active);
        cleanup();
      }
    });
  }

  run(caller: Stack): void {
    verify(
      this.#active,
      isEqual(undefined),
      expected("setup handler").toBe("setup only once").butGot("a second run")
    );

    const cleanup = FormulaState.evaluate(
      () => this.#setup(),
      this.#description,
      caller
    );

    this.#active = cleanup.state;
  }

  poll(caller: Stack): void {
    if (this.#active) {
      const validate = this.#active.validate(caller);

      if (validate.state === "valid") {
        return;
      }

      validate.oldValue();
      validate.compute();
    }
  }
}

export interface CreateResource<T> {
  create(this: void, options: { owner: object }): Resource<T>;
}

export function Resource<T>(
  constructor: ResourceConstructor<T>,
  description?: string | Description
): CreateResource<T> {
  const desc = descriptionFrom({
    type: "resource",
    api: {
      package: "@starbeam/core",
      name: "Resource",
    },
    fromUser: description,
  });

  const caller = callerStack();

  return {
    create: (options) => {
      const resource = ResourceBuilder.build(constructor, desc, caller);
      LIFETIME.link(options.owner, resource);
      return resource;
    },
  };
}

Resource.setup = ReactiveResource.setup;
Resource.reinitialize = ReactiveResource.reinitialize;

export type Resource<T> = ReactiveResource<T>;
export type ResourceConstructor<T> = (builder: ResourceBuilder) => () => T;
export type { ResourceBuilder };
