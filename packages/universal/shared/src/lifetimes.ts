import { getCoordination, type Lifetime } from "./env.js";
import type { Unregister } from "./types.js";

const coordination = getCoordination();

let lifetime = coordination.lifetime;

interface LifetimeState {
  readonly object: WeakRef<object>;
  readonly finalizers: Set<() => void>;
  readonly children: Set<LifetimeState>;
  finalized: boolean;
}

let id = 0;

if (!lifetime) {
  class LifetimeState {
    readonly #object: WeakRef<object>;
    readonly #finalizers = new Set<() => void>();
    readonly children = new Set<LifetimeState>();
    #finalized = false;

    constructor(object: object) {
      this.#object = new WeakRef(object);
    }

    add(finalizer: () => void) {
      this.#finalizers.add(finalizer);
    }

    delete(finalizer: () => void) {
      this.#finalizers.delete(finalizer);
    }

    finalize() {
      if (this.#finalized) return;
      this.#finalized = true;

      for (const child of this.children) child.finalize();
      for (const finalizer of this.#finalizers) finalizer();
      this.#finalizers.clear();
    }
  }

  class Lifetimes implements Lifetime {
    readonly #lifetimes = new WeakMap<object, LifetimeState>();
    #currentScopeState: LifetimeState | undefined;
    #createRegistry: () => FinalizationRegistry<LifetimeState>;
    #lazyRegistry: FinalizationRegistry<LifetimeState> | undefined;

    constructor() {
      this.#createRegistry = () => {
        const Registry = coordination.testing?.registry ?? FinalizationRegistry;
        return new Registry((state) => void state.finalize());
      };
    }

    readonly createFinalizationScope = () => {
      const parentScopeState = this.#currentScopeState;

      const childScope = { id: id++ };
      const childScopeState = this.#upsertState(childScope);
      this.#currentScopeState = childScopeState;

      parentScopeState?.children.add(childScopeState);

      return () => {
        if (
          import.meta.env.DEV &&
          this.#currentScopeState !== childScopeState
        ) {
          throw new Error(
            "a finalization scope must be finalized in the same order as it was created"
          );
        }

        this.#currentScopeState = parentScopeState;
        return childScope;
      };
    };

    readonly linkToFinalizationScope = (child: object) => {
      if (!this.#currentScopeState) return () => void null;
      const currentSnapshot = this.#currentScopeState;

      const childState = this.#upsertState(child);
      currentSnapshot.children.add(childState);
      return () => void currentSnapshot.children.delete(childState);
    };

    readonly onFinalize = (object: object, finalizer: () => void) => {
      const state = this.#upsertState(object);
      state.add(finalizer);

      return () => void state.delete(finalizer);
    };

    readonly finalize = (object: object | undefined): void => {
      if (!object) return;
      const state = this.#lifetimes.get(object);
      if (state) state.finalize();
    };

    get #registry() {
      let registry = this.#lazyRegistry;

      if (!registry) {
        registry = this.#createRegistry();
        this.#lazyRegistry = registry;
      }

      return registry;
    }

    #upsertState(object: object): LifetimeState {
      const registry = this.#registry;

      let state = this.#lifetimes.get(object);

      if (!state) {
        state = new LifetimeState(object);
        this.#lifetimes.set(object, state);
        registry.register(object, state);
      }

      return state;
    }
  }

  lifetime = coordination.lifetime = new Lifetimes();
}

const LIFETIME = lifetime;

export function createFinalizationScope(): () => object {
  return LIFETIME.createFinalizationScope();
}

export function linkToFinalizationScope(child: object): Unregister {
  return LIFETIME.linkToFinalizationScope(child);
}

export function finalize(object: object): void {
  LIFETIME.finalize(object);
}

export function onFinalize(object: object, handler: () => void): void {
  LIFETIME.onFinalize(object, handler);
}
