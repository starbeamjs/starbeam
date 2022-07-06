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
 * The `useLifecycle` hook gives you a way to create a new instance of something
 * when the component is first instantiated, clean it up when the component is
 * unmounted, and create a brand **new** instance when the component is
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

import {
  type MutableRefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { beginReadonly, endReadonly } from "./react.js";
import { useLastRenderRef } from "./updating-ref.js";
import { UNINITIALIZED } from "./utils.js";

type State = "mounting" | "mounted" | "remounting" | "unmounted";

export function useLifecycle<T, A>(
  args: A,
  build: (builder: ResourceBuilder<A>, args: A, prev?: T) => T
): T;
export function useLifecycle<T>(
  build: (builder: ResourceBuilder<void>, prev?: T) => T
): T;
export function useLifecycle<T, A>(
  ...options:
    | [args: A, build: (builder: ResourceBuilder<A>, args: A, prev?: T) => T]
    | [build: (builder: ResourceBuilder<void>, prev?: T) => T]
): T {
  const [, setNotify] = useState({});
  const state = useRef<State>("mounting");

  const arg = options.length === 1 ? (undefined as unknown as A) : options[0];
  const buildFn =
    options.length === 1
      ? (builder: ResourceBuilder<A>, _: A, prev?: T) =>
          // eslint-disable-next-line
          options[0](builder as any, prev)
      : options[1];

  const initialRef = useRef<UNINITIALIZED | ResourceInstance<T, A>>(
    UNINITIALIZED
  );

  if (initialRef.current === UNINITIALIZED) {
    initialRef.current = ResourceBuilder.build(buildFn, arg);
  } else {
    // If we're remounting, we're effectively in the initial state, and the work already happened
    // in `useLayoutEffect`, so don't do anything here.

    if (state.current === "mounted") {
      initialRef.current.run("update", arg);
    } else {
      state.current = "mounted";
    }
  }

  const ref = initialRef as MutableRefObject<ResourceInstance<T, A>>;

  // The callback to useLayoutEffect is created once, but should see the most recent rendered args.
  const renderedArgs = useLastRenderRef(arg);

  useLayoutEffect(() => {
    switch (state.current) {
      case "unmounted": {
        setNotify({});
        ref.current = ref.current.remount(renderedArgs.current);

        state.current = "remounting";
        break;
      }
      default: {
        state.current = "mounted";
      }
    }

    ref.current.run("layout", renderedArgs.current);

    return () => {
      ref.current.run("cleanup", renderedArgs.current);
      state.current = "unmounted";
    };
  }, []);

  useEffect(() => {
    ref.current.run("idle", renderedArgs.current);

    // we don't need to return a cleanup function since we already did that in useLayoutEffect
  }, []);

  return ref.current.instance;
}

class ResourceInstance<T, A> {
  #builder: ResourceBuilder<A>;
  #instance: T;

  constructor(builder: ResourceBuilder<A>, instance: T) {
    this.#builder = builder;
    this.#instance = instance;
  }

  get instance(): T {
    return this.#instance;
  }

  remount(args: A): ResourceInstance<T, A> {
    return ResourceBuilder.remount(this.#builder, args, this.#instance);
  }

  run(event: "cleanup" | "layout" | "idle" | "update", args: A) {
    ResourceBuilder.run(this.#builder, event, args);
  }
}

class ResourceBuilder<A> {
  static build<T, A>(
    build: (builder: ResourceBuilder<A>, args: A, prev?: T) => T,
    args: A,
    prev?: T
  ): ResourceInstance<T, A> {
    const builder = new ResourceBuilder(build);
    beginReadonly();
    try {
      const instance = new ResourceInstance(
        builder,
        build(builder, args, prev)
      );
      endReadonly();
      return instance;
    } catch (e) {
      endReadonly();
      throw e;
    }
  }

  static remount<T, A>(
    builder: ResourceBuilder<A>,
    args: A,
    prev: T
  ): ResourceInstance<T, A> {
    return ResourceBuilder.build(
      builder.#build,
      args,
      prev
    ) as ResourceInstance<T, A>;
  }

  static run<A>(
    resource: ResourceBuilder<A>,
    event: "cleanup" | "layout" | "idle" | "update",
    args: A
  ) {
    for (const callback of resource.#on[event]) {
      callback(args);
    }
  }

  #build: (builder: ResourceBuilder<A>, args: A, prev: unknown) => unknown;

  constructor(build: (builder: ResourceBuilder<A>, args: A) => unknown) {
    this.#build = build;
  }

  #on = {
    cleanup: new Set<(args: A) => void>(),
    layout: new Set<(args: A) => void>(),
    idle: new Set<(args: A) => void>(),
    update: new Set<(args: A) => void>(),
  };

  on = {
    cleanup: (cleanup: (args: A) => void): void => {
      this.#on.cleanup.add(cleanup);
    },

    update: (update: (args: A) => void): void => {
      this.#on.update.add(update);
    },

    layout: (onLayout: (args: A) => void): void => {
      this.#on.layout.add(onLayout);
    },

    idle: (onIdle: (args: A) => void): void => {
      this.#on.idle.add(onIdle);
    },
  };
}
