import {
  type FinalizationScope,
  getCoordination,
  type Lifetime,
} from "./env.js";
import type { Unregister } from "./types.js";

const coordination = getCoordination();

let lifetime = coordination.lifetime;

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

    finalize(): boolean {
      if (this.#finalized) return false;
      this.#finalized = true;

      for (const child of this.children) child.finalize();
      for (const finalizer of this.#finalizers) finalizer();
      this.#finalizers.clear();
      return true;
    }

    isFinalized(): boolean {
      return this.#finalized;
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

    readonly mountFinalizationScope = (
      child: object = { id: id++ },
    ): (() => FinalizationScope) => {
      return this.#addFinalizationScope(child);
    };

    readonly pushFinalizationScope = (
      child: object = { id: id++ },
    ): (() => FinalizationScope) => {
      return this.#addFinalizationScope(child, { to: "parent" });
    };

    readonly linkToFinalizationScope = (
      child: object,
      { parent }: { parent?: object } = {},
    ) => {
      if (!this.#currentScopeState && !parent) return () => void null;

      const childState = this.#upsertState(child);

      if (parent) {
        const parentState = this.#upsertState(parent);

        parentState.children.add(childState);
        return () => void parentState.children.delete(childState);
      }

      if (!this.#currentScopeState) return () => void null;
      const currentSnapshot = this.#currentScopeState;

      currentSnapshot.children.add(childState);
      return () => void currentSnapshot.children.delete(childState);
    };

    readonly onFinalize = (
      parentOrHandler?: object | (() => void),
      maybeHandler?: undefined | (() => void),
    ) => {
      const parent = maybeHandler && parentOrHandler;
      const handler = maybeHandler ?? (parentOrHandler as () => void);

      if (parent) {
        const parentState = this.#upsertState(parent);
        parentState.add(handler);
        return () => void parentState.delete(handler);
      }

      if (!this.#currentScopeState) return () => void null;
      const currentSnapshot = this.#currentScopeState;

      currentSnapshot.add(handler);
      return () => void currentSnapshot.delete(handler);
    };

    readonly finalize = (object: object | undefined): boolean => {
      if (!object) return false;
      return this.#lifetimes.get(object)?.finalize() ?? false;
    };

    readonly isFinalized = (object: object): boolean => {
      return this.#lifetimes.get(object)?.isFinalized() ?? false;
    };

    #addFinalizationScope = (
      child: object,
      link?: { to: "parent" } | undefined,
    ): (() => FinalizationScope) => {
      const parentScopeState = this.#currentScopeState;
      const childScopeState = this.#upsertState(child);
      this.#currentScopeState = childScopeState;

      if (link?.to === "parent")
        parentScopeState?.children.add(childScopeState);

      return () => {
        if (
          import.meta.env.DEV &&
          this.#currentScopeState !== childScopeState
        ) {
          throw new Error(
            "a finalization scope must be finalized in the same order as it was created",
          );
        }

        this.#currentScopeState = parentScopeState;
        return child;
      };
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

export function mountFinalizationScope(
  scope?: object,
): () => FinalizationScope {
  return LIFETIME.mountFinalizationScope(scope);
}

export function pushFinalizationScope(
  scope?: FinalizationScope | undefined,
): () => FinalizationScope {
  return LIFETIME.pushFinalizationScope(scope);
}

export function linkToFinalizationScope(
  child: object,
  parent?: object,
): Unregister {
  return LIFETIME.linkToFinalizationScope(child, parent);
}

/**
 * Attempt to finalize the given object.
 *
 * If the object is not finalizable, return false.
 * If the object was already finalized, return false.
 * Otherwise, finalize the object and return true.
 */
export function finalize(object: object): boolean {
  return LIFETIME.finalize(object);
}

export function onFinalize(object: object, handler: () => void): Unregister;
export function onFinalize(handler: () => void): Unregister;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function onFinalize(...args: any[]): Unregister {
  return LIFETIME.onFinalize(
    ...(args as Parameters<typeof LIFETIME.onFinalize>),
  );
}

export function isFinalized(object: object): boolean {
  return LIFETIME.isFinalized(object);
}
