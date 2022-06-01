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

import { Stack } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";
import {
  type CleanupTarget,
  type OnCleanup,
  type ReactiveInternals,
  LIFETIME,
  REACTIVE,
} from "@starbeam/timeline";

import type { Reactive } from "../../reactive.js";
import { CompositeInternals } from "../../storage/composite.js";
import { Marker } from "../marker.js";
import type { Formula } from "./formula.js";
import { FormulaState } from "./state.js";

interface ResourceConstructor<T> {
  (builder: BuildResource): Formula<T>;
}

interface ResourceState<T> {
  readonly creation: FormulaState<Formula<T>>;
  readonly lifetime: object;
  readonly formula: Formula<T>;
}

class ReactiveResource<T> implements Reactive<T> {
  static create<T>(
    create: ResourceConstructor<T>,
    description = Stack.describeCaller()
  ): ReactiveResource<T> {
    return new ReactiveResource(
      create,
      Marker(description),
      UNINITIALIZED,
      description
    );
  }

  #create: ResourceConstructor<T>;
  /**
   * The marker will bump when the resource is first initialized. This allows consumers of the resource to invalidate without forcing them computing the value of the resource.
   */
  #initialized: Marker;
  #state: ResourceState<T> | UNINITIALIZED;
  #description: string;

  private constructor(
    create: ResourceConstructor<T>,
    initialized: Marker,
    state: ResourceState<T> | UNINITIALIZED,
    description: string
  ) {
    this.#create = create;
    this.#initialized = initialized;
    this.#state = state;
    this.#description = description;
  }

  get [REACTIVE](): ReactiveInternals {
    if (this.#state === UNINITIALIZED) {
      return this.#initialized[REACTIVE];
    } else {
      return CompositeInternals(
        [this.#initialized, this.#state.creation],
        this.#description
      );
    }
  }

  get current(): T {
    if (this.#state === UNINITIALIZED) {
      const formula = this.#initialize();
      return formula.current;
    } else {
      const { creation, formula, lifetime } = this.#state;

      const result = creation.validate();

      if (result.state === "valid") {
        return formula.current;
      } else {
        const formula = this.#initialize({ last: lifetime });
        return formula.current;
      }
    }
  }

  #initialize(options?: { last: object | undefined }) {
    if (options?.last) {
      LIFETIME.finalize(options.last);
    }

    const build = BuildResource.create();

    const { state, value: formula } = FormulaState.evaluate(
      () => this.#create(build),
      this.#description
    );

    this.#state = {
      creation: state,
      lifetime: BuildResource.lifetime(build),
      formula,
    };

    return formula;
  }
}

class BuildResource implements CleanupTarget {
  static create() {
    return new BuildResource({});
  }

  static lifetime(build: BuildResource): object {
    return build.#object;
  }

  /**
   * This object represents the instance of the resource being constructed.
   * Finalizers and linked children will be associated with this object, and
   * when the resource is finalized, this object will be finalized;
   */
  #object: object;

  constructor(object: object) {
    this.#object = object;
  }

  readonly on: OnCleanup = {
    cleanup: (handler: () => void) =>
      LIFETIME.on.cleanup(this.#object, handler),
  };

  link(child: object): () => void {
    return LIFETIME.link(this.#object, child);
  }
}

export function Resource<T>(
  create: ResourceConstructor<T>,
  description = Stack.describeCaller()
): ReactiveResource<T> {
  return ReactiveResource.create(create, description);
}
