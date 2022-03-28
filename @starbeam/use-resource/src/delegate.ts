import type { LifecycleConfig } from "./resource.js";

export interface CreateResource<T, A> {
  /**
   * When the instance was created. Code that runs immediately after useInstance
   * will see anything you did in the create callback.
   *
   * ## Scheduling
   *
   * The `create` call runs inside of the call to {@link useResource}. Whatever
   * it does will be visible to code that is immediately after it in the
   * component's function.
   *
   * ## Lifecycle
   *
   * Runs when the component was **activating**. A component is activating the
   * first time it is run, and again when the component is **reactivated**.
   */
  (local: A, options: LifecycleConfig): T;
}

export interface ReactivateResource<T, A> {
  /**
   * When the instance was created. Code that runs immediately after useInstance
   * will see anything you did in the create callback.
   *
   * ## Scheduling
   *
   * The `create` call runs inside of the call to {@link useResource}. Whatever
   * it does will be visible to code that is immediately after it in the
   * component's function.
   *
   * ## Lifecycle
   *
   * Runs when the component was **activating**. A component is activating the
   * first time it is run, and again when the component is **reactivated**.
   */
  (local: A, prev: T, options: LifecycleConfig): T;
}

export interface UpdateResource<T, A> {
  /**
   * Runs every time the component function is rendered, except the first time.
   *
   * ## Scheduling
   *
   * The `create` call runs inside of the call to useInstance. Whatever it does
   * will be visible to code that is immediately after it in the component's
   * function.
   *
   * Each time React renders the component, either `create` or `update` will run
   * **inline**. This means that code that runs immediately after `useInstance`
   * can assume that the instance's state is up-to-date.
   *
   * ## Lifecycle
   *
   * Runs when the component is **updating**. A component is updated every time
   * the component function is rendered, except the first time (when it is
   * activating).
   */
  (instance: T, local: A): void;
}

export interface LifecycleEvents<T, U> {
  /**
   * When React is cleaning up the current component, but not necessarily for
   * the last time.
   *
   * ## Scheduling
   *
   * The `deactivate` call runs when React is deactivating a component, while
   * the component's elements are still in the DOM.
   *
   * ## Lifecycle
   *
   * Runs when the component is **deactivating**. A component can be deactivated
   * for various reasons.
   *
   * After a component is deactivated:
   *
   * - it may get activated again (e.g. the speculative offscreen API)
   * - its elements may stay in the DOM (e.g. HMR)
   * - both, neither?
   *
   * > As of React 18, React Strict Mode automatically deactivates and
   * > reactivates all components during initial render, just to make sure that
   * > the component is able to handle HMR and possible future APIs that will
   * > depend on deactivation.
   */
  readonly deactivate?: (instance: T) => void | T;

  /**
   * When the current component was attached to the DOM, but before it was
   * painted.
   *
   * ## Scheduling
   *
   * Runs after the component function finished rendered, and after the
   * component's JSX was inserted into the DOM, but before the browser painted
   * the component.
   *
   * In other words, it runs with the same timing as {@link useLayoutEffect}.
   *
   * ## Lifecycle
   *
   * Runs when the component was **attached**. A component is attached the first
   * time it is inserted into the DOM, and again whenever a reactivated
   * component is inserted into the DOM.
   */
  readonly attached?: (instance: T) => void;

  /**
   * Runs after `attach`, once the browser has become idle.
   *
   * ## Scheduling
   *
   * Runs after {@link attached}, once the browser is idle.
   *
   * It is not guaranteed to run on every attached component: a component can
   * get deactivated before it becomes ready.
   *
   * ## Timing
   *
   * Run when the component becomes **ready**. A component becomes **ready** at
   * some point after it is **attached**, and React decides that running ready
   * callbacks won't interfere with the smooth functioning of the user interface
   * (such as scrolling).
   *
   * In other words, it runs with the same timing as {@link useEffect}.
   */
  readonly ready?: (instance: T) => void;
}

export type LifecycleDelegate<T, A> = {
  create: CreateResource<T, A>;
  update?: UpdateResource<T, A>;
  reactivate?: ReactivateResource<T, A>;
} & LifecycleEvents<T, A>;
