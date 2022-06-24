import {
  type MutableRefObject,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

import {
  isAttachedState,
  isPreparedForActivationState,
  isReadyState,
} from "./assertions.js";
import type {
  CreateResource,
  LifecycleDelegate,
  LifecycleEvents,
  ReactivateResource,
  UpdateResource,
} from "./delegate.js";
import { callerFrame } from "./description.js";
import type { ReadyReactState, RenderedReactState } from "./states.js";
import {
  type TopLevelReactState,
  DeactivatedReactState,
  InstantiatedReactState,
  ReactState,
  ReadyToReactivateReactState,
} from "./states.js";
import { type Ref, useLastRenderRef, useUpdatingRef } from "./updating-ref.js";
import { check, checked, exhaustive } from "./utils.js";

export interface LifecycleConfig {
  readonly description: string;
  readonly notify: () => void;
}

export type LifecycleOptions = Partial<LifecycleConfig>;

/**
 * When you render a component in React, it gets a unique "rendered component
 * instance". If the component function contains any calls to `useState`,
 * `useRef`, etc. they will be associated with that unique instance.
 *
 * Consider this example:
 *
 * ```ts
 * function Counter() {
 *   const [count, setCount] = useState(0);
 *
 *   return <>
 *     <button onClick={setCount(count => count + 1)}>++</button>
 *     <p>{count}</p>
 *   </>
 * }
 * ```
 *
 * When React render the Counter component for the first time, the component
 * calls `useState(0)`. React creates a fresh place to store state **for this
 * rendered component instance** and stores `0` in it.
 *
 * The call to `useState(0)` returns the number `0` as well as a function that
 * you can use to update the counter value.
 *
 * Whenever React runs the Counter function a second time **for the same
 * component instance**, the call to `useState` links back up to the same
 * storage location, and React returns the current value stored in that
 * location, as well as the setter function.
 *
 * When you use the setter returned by `useState` to increment the value, React
 * changes the value in the storage location (in this case to `1`). Since a
 * storage location **associated with this component instance** changed, React
 * knows it needs to re-render the `Counter` component, and it schedules an
 * update.
 *
 * The next time React renders the component, the call to `useState` will link
 * back up to the storage location, and voila, the return value will be `[1,
 * setter]`.
 *
 * ## The Catch
 *
 * This all works great, with a small catch.
 *
 * As of React 18, React may run a component's cleanup functions (the return
 * values of `useEffect` and `useLayoutEffect`) and *then* run its setup
 * functions (the callbacks in `useEffect` and `useLayoutEffect`) *again*.
 *
 * > This currently happens when using [Fast Refresh] and is enforced via React
 * > 18 strict mode. The React team has said that it may run setup functions
 * > after cleanup for other reasons in the future. For now, support for strict
 * > mode is a good enough reason to care.
 *
 * This means that a "component instance" may persist across cleanup.
 * **Importantly**, this means that your setup code is not allowed to assume
 * that it runs **after** the top-level of your component function, but
 * **before** cleanup.
 *
 * > TODO: Add an example
 *
 * This is all rather hard to get right.
 *
 * ## The Solution
 *
 * The `useInstance` hook gives you a way to create a new instance of something
 * when the component is first instantiated, clean it up when the component is
 * deactivated, and create a brand **new** instance when the component is
 * reactivated.
 *
 * TL;DR It works almost the same way that per-component state in React works,
 * but gives you a fresh copy whenever React re-attaches the component.
 *
 * In practice, this means that you can treat React's behavior as a pooling
 * optimization, rather than as a detail that your component needs to think
 * about.
 *
 * ## Lifecycle
 *
 * ```
 * first run: instantiating
 * - inline: create
 * - before paint: attach
 * - browser idle: ready
 *
 * second run: updating
 * - inline: update
 *
 * deactivating
 * - inline: finalize instance & deactivate
 *
 * reactivating (same as activating)
 * - inline: create
 * - before paint: attach
 * - browser idle: ready
 * ...
 * ```
 *
 * [fast refresh]: https://www.npmjs.com/package/react-refresh
 */

class Resource<T, A> {
  static create<T, A>(
    delegate: CreateResource<T, A>,
    args: A,
    options?: LifecycleOptions
  ): Resource<T, A> {
    if (typeof delegate === "function") {
      return new Resource({ create: delegate }, options ?? {}, args);
    } else {
      return new Resource(delegate, options ?? {}, args);
    }
  }

  #delegate: LifecycleDelegate<T, A>;
  #options: LifecycleOptions;
  #args: A;

  private constructor(
    delegate: LifecycleDelegate<T, A>,
    options: LifecycleOptions,
    args: A
  ) {
    this.#delegate = delegate;
    this.#options = options;
    this.#args = args;
  }

  options(options: LifecycleOptions): Resource<T, A> {
    return new Resource(
      this.#delegate,
      { ...this.#options, ...options },
      this.#args
    );
  }

  as(description: string): Resource<T, A> {
    return this.options({ description });
  }

  notifier(notify: () => void): Resource<T, A> {
    return this.options({ notify });
  }

  update(updater: UpdateResource<T, A>): Resource<T, A> {
    return new Resource(
      { ...this.#delegate, update: updater },
      this.#options,
      this.#args
    );
  }

  reactivate(reactivate: ReactivateResource<T, A>): Resource<T, A> {
    return new Resource(
      { ...this.#delegate, reactivate },
      this.#options,
      this.#args
    );
  }

  on(delegate: LifecycleEvents<T, A>): Ref<T> {
    this.#delegate = { ...this.#delegate, ...delegate };
    return createResource(
      { ...this.#delegate, ...delegate },
      this.#args,
      this.#options
    );
  }
}

function createResource<T, A>(
  delegate: LifecycleDelegate<T, A>,
  args: A,
  options?: LifecycleOptions
): Ref<T> {
  const description = options?.description ?? callerFrame({ extraFrames: 1 });
  const perRenderState = useLastRenderRef(args);

  let notify: () => void;

  if (options?.notify) {
    notify = options.notify;
  } else {
    const [, setNotify] = useState({});
    notify = () => setNotify({});
  }

  const config: LifecycleConfig = { description, notify };

  const { ref: state, value: current } = useUpdatingRef.mutable<
    TopLevelReactState<T>,
    ReactState<T>
  >({
    initial: () => {
      const instance = delegate.create(perRenderState.current, config);
      return ReactState.rendering(instance);
    },
    update: (lifecycle) => {
      if (ReadyToReactivateReactState.is(lifecycle)) {
        if (delegate.reactivate && lifecycle.prev) {
          return lifecycle.reactivating(
            delegate.reactivate(perRenderState.current, lifecycle.prev, config)
          );
        } else {
          return lifecycle.reactivating(
            delegate.create(perRenderState.current, config)
          );
        }
      } else {
        check(
          lifecycle,
          isReadyState({
            situation: "rerendering a component",
          })
        );

        return lifecycle.updating();
      }
    },
  });

  const rendered = (state.current = renderLifecycle(
    current,
    delegate,
    perRenderState.current
  ));

  useLayoutLifecycle(state, delegate, notify);
  useReadyLifecycle(state, delegate);

  state.current.flush();

  const result = useLastRenderRef(rendered.value);

  return result;
}

export function useResource(): {
  create: <T>(
    create: CreateResource<T, void>,
    options?: LifecycleOptions
  ) => Resource<T, void>;
} {
  return useResource.withState(undefined as void);
}

useResource.create = <T>(
  create: CreateResource<T, void>
): Resource<T, void> => {
  return useResource.withState(undefined as void).create(create);
};

useResource.withState = <A>(
  state: A
): {
  create: <T>(
    create: CreateResource<T, A>,
    options?: LifecycleOptions
  ) => Resource<T, A>;
} => {
  return {
    create: <T>(create: CreateResource<T, A>, options?: LifecycleOptions) =>
      Resource.create(create, state, options),
  };
};

function useReadyLifecycle<T>(
  state: MutableRefObject<ReactState<T>>,
  delegate: LifecycleEvents<T, any>
): void {
  useEffect(() => {
    if (ReadyToReactivateReactState.is(state.current)) {
      // If we're running inside ReadyToReactivate, we can't run the ready
      // callback yet, because the instance will be created when the top-level
      // component renders.
      //
      // We'll run the ready callback once instantiation has occurred.

      return;
    }

    const current = checked(
      state.current,
      isAttachedState<T>({ situation: "Inside of useEffect" })
    );

    state.current = current.ready({ delegate, callbacks: ["ready"] }).flush();
  }, []);
}

function useLayoutLifecycle<T>(
  state: MutableRefObject<ReactState<T>>,
  delegate: LifecycleDelegate<T, any>,
  notify: () => void
): void {
  useLayoutEffect(() => {
    const current = checked(
      state.current,
      isPreparedForActivationState<T>({
        situation: "Inside of useLayoutEffect",
      })
    );

    // If we're reactivating, notify React so that a top-level render will occur
    // and cause the state to instantiate.
    if (DeactivatedReactState.is(current)) {
      notify();
      state.current = current.readyToReactivate();
    } else {
      delegate.attached?.(current.value);
      state.current = current.attached();
    }

    return cleanup(state, delegate);
  }, []);
}

function cleanup<T>(
  state: MutableRefObject<ReactState<T>>,
  delegate: LifecycleDelegate<T, any>
) {
  return () => {
    const current = state.current;

    if (InstantiatedReactState.is(current)) {
      delegate.deactivate?.(current.value);

      state.current = delegate.reactivate
        ? ReactState.deactivated(current.value)
        : ReactState.deactivated(null);
    } else {
      console.warn(`TODO: Unexpectedly deactivating in state`, current);
      state.current = ReactState.deactivated(null);
    }
  };
}

function renderLifecycle<T, A>(
  state: TopLevelReactState<T>,
  delegate: LifecycleDelegate<T, A>,
  props: A
): ReadyReactState<T> | RenderedReactState<T> {
  switch (state.type) {
    case "Rendering":
      return state.rendered();
    case "Updating":
      delegate.update?.(state.value, props);
      return state.ready();
    case "Reactivating":
      return state.ready({ delegate, callbacks: ["attached", "ready"] });
    default:
      exhaustive(state, `state.type`);
  }
}
