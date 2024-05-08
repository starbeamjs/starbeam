/**
 * # High Level Documentation
 *
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
 * The `useLifecycle` hook gives you a way to create a new instance of
 * something when the component is first instantiated, clean it up when the
 * component is unmounted, and create a brand **new** instance when the
 * component is reactivated.
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
 * unmounting
 * - inline: finalize instance & unmount
 *
 * remounting (same as mounting)
 * - inline: create
 * - before paint: attach
 * - browser idle: ready
 * ...
 * ```
 *
 * [fast refresh]: https://www.npmjs.com/package/react-refresh
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { beginReadonly, endReadonly } from "./react.js";
import type { Ref } from "./refs.js";
import { useInitializedRef, useLastRenderRef } from "./refs.js";
import { checked, isInitialized, mapEntries, UNINITIALIZED } from "./utils.js";

enum State {
  /**
   * A component starts out in the "mounting" state and transitions to the
   * "mounted" state in the component's first `useLayoutEffect` callback.
   */
  mounting = "mounting",
  /**
   * Once a component has reached its first `useLayoutEffect` callback, it's
   * in the "mounted" state until it's unmounted.
   */
  mounted = "mounted",
  /**
   * A component is in the "unmounted" when its `useLayoutEffect` cleanup
   * function runs.
   */
  unmounted = "unmounted",
  /**
   * If a component's `useLayoutEffect` function runs again, it's in the
   * "remounting" state.
   */
  remounting = "remounting",
}

export type UseLifecycleBuilder<T, A> = (
  builder: Builder<A>,
  args: A,
  prev?: T | undefined,
) => T;
type Validator<V> = (args: V, prev: V) => boolean;

interface Options<V, A> {
  readonly props?: A | undefined;
  readonly validate?: V;
  readonly with?: Validator<V>;
}

enum LifecycleEvent {
  cleanup = "cleanup",
  layout = "layout",
  idle = "idle",
  update = "update",
}

export function useLifecycle<V, A>(
  options: Options<V, A> = {},
): {
  render: <T>(build: UseLifecycleBuilder<T, A>) => T;
} {
  return {
    render: (<T>(build: UseLifecycleBuilder<T, unknown>) => {
      const [, setNotify] = useState({});
      const notify = () => {
        setNotify({});
      };
      const state = useRef(State.mounting);
      const [renderedArgs] = useLastRenderRef(options.props as A);

      const [instance, isUpdate] = useInitializedRef(() => {
        return buildInstance<T, V, A>({
          options: {
            build,
            args: renderedArgs,
            notify,
            validateWith: options.with ?? Object.is,
          },
        });
      });

      if (isUpdate) {
        if (state.current === State.mounted) {
          // If already mounted, we're _updating_: call the update callback.
          run(LifecycleEvent.update);
        } else {
          // If _remounting_, update already happened in `useLayoutEffect`.
          state.current = State.mounted;
        }
      }

      function run(event: LifecycleEvent): void {
        runHandlers(checked(instance.current, isInitialized), event);
      }

      const [validate, prev] = useLastRenderRef(options.validate);

      if (prev !== UNINITIALIZED) {
        const isValid = validateUpdate(
          instance.current.options.validateWith,
          validate.current as V,
          prev as V,
        );

        // If validation fails, immediately remount.
        if (!isValid) {
          run(LifecycleEvent.cleanup);
          instance.current = buildInstance<T, V, A>(instance.current);
          run(LifecycleEvent.layout);
        }
      }

      useLayoutEffect(() => {
        if (state.current === State.unmounted) {
          // Remount:
          // Notify react so that remounting causes a re-render.
          notify();
          // Rebuild the instance.
          instance.current = buildInstance(
            checked(instance.current, isInitialized),
          );

          // Finish the job in the top-level render. This maintains timing
          // consistency with the initial render (the instantiation callback
          // always runs during a render).
          state.current = State.remounting;
        } else {
          // Initial Mount:
          state.current = State.mounted;
        }

        run(LifecycleEvent.layout);

        return () => {
          run(LifecycleEvent.cleanup);
          state.current = State.unmounted;
        };
      }, []);

      useEffect(() => {
        run(LifecycleEvent.idle);

        // we don't need to return a cleanup function since we already did that
        // in useLayoutEffect
      }, []);

      return instance.current.value;
    }) as <T>(build: unknown) => T,
  };
}

interface Instance<T, V, A> {
  readonly value: T;
  readonly options: LifecycleOptions<T, V, A>;
  readonly handlers: HandlerSets<A>;
}

type HandlerSets<A> = {
  readonly [K in LifecycleEvent]: Set<(args: A) => void>;
};

export type RegisterLifecycleHandlers<A> = {
  readonly [K in LifecycleEvent]: (
    handler: undefined | ((args: A) => void),
  ) => void;
};

interface LifecycleOptions<T, V, A> {
  readonly build: UseLifecycleBuilder<T, A>;
  readonly args: Ref<A>;
  readonly validateWith: Validator<V> | undefined;
  readonly notify: () => void;
}

interface LifecycleState<T, V, A> {
  readonly options: LifecycleOptions<T, V, A>;
  readonly handlers: HandlerSets<A>;
}

function buildInstance<T, V, A>({
  options,
  value: prev,
}: {
  options: LifecycleOptions<T, V, A>;
  value?: T;
}): Instance<T, V, A> {
  const handlers: HandlerSets<A> = {
    cleanup: new Set(),
    layout: new Set(),
    idle: new Set(),
    update: new Set(),
  };
  const args = options.args;
  const builder = Builder<T, V, A>({ options, handlers });
  beginReadonly();
  try {
    const instance: Instance<T, V, A> = {
      value: options.build(builder, args.current, prev),
      handlers,
      options,
    };
    endReadonly();
    return instance;
  } catch (e) {
    endReadonly();
    throw e;
  }
}

const runHandlers = <A>(
  instance: { handlers: HandlerSets<A>; options: { args: Ref<A> } },
  event: LifecycleEvent,
): void => {
  for (const callback of instance.handlers[event]) {
    callback(instance.options.args.current);
  }
};

const validateUpdate = <V>(
  validateWith: Validator<V> | undefined,
  current: V,
  prev: V,
): boolean => validateWith === undefined || validateWith(current, prev);

export interface Builder<A> {
  readonly notify: () => void;
  readonly on: RegisterLifecycleHandlers<A>;
}

const Builder = <T, V, A>(state: LifecycleState<T, V, A>): Builder<A> => {
  return {
    notify: state.options.notify,
    on: mapEntries(LifecycleEvent, (value) => registerFn(state, value)),
  };
};

const registerFn =
  <A>(state: { handlers: HandlerSets<A> }, handler: LifecycleEvent) =>
  (callback: undefined | ((args: A) => void)) => {
    if (!callback) return;
    return state.handlers[handler].add(callback);
  };
