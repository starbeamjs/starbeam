import { isObject, Overload } from "@starbeam/core-utils";
import { type Description, Desc } from "@starbeam/debug";
import type { Reactive } from "@starbeam/interfaces";
import { LIFETIME, TIMELINE } from "@starbeam/timeline";
import { Formula, PolledFormula } from "@starbeam/universal";
import {
  setupFunction,
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { useStarbeamApp } from "./context-provider.js";
import { ReactiveElement } from "./element.js";
import { useNotify, useReactive } from "./use-reactive.js";
import { useProp } from "./utils.js";

/**
 * Create a stable object that will automatically be cleaned up when the
 * component is unmounted, **including** when the component is unmounted
 * temporarily (i.e. when state is [reused] by React).
 *
 * [reused]: https://github.com/reactwg/react-18/discussions/19
 */
export function useComponent(): object {
  return useLifecycle().render(({ on }) => {
    const owner = Object.create(null) as object;

    on.cleanup(() => {
      LIFETIME.finalize(owner);
    });

    return owner;
  });
}

/**
 * Run a callback when the component is mounted, and return the result.
 *
 * The callback will be run again if the component is unmounted and then remounted (i.e. when state
 * is [reused] by React).
 *
 * When a component is unmounted (even temporarily), the object returned by `useSetup` will be
 * finalized. You can therefore use the return value of `useSetup` as the owner of other resources.
 *
 * `useSetup` also supports `on.layout` and `on.idle` callbacks, which will be called when React
 * schedules `useLayoutEffect` callbacks ("layout timing") or `useEffect` callbacks ("idle timing")
 * respectively.
 *
 * [reused]: https://github.com/reactwg/react-18/discussions/19
 */
export function useSetup<T>(
  callback: (setup: ReactiveElement) => T,
  description?: string | Description
): T {
  const starbeam = useStarbeamApp({
    feature: "useSetup()",
    allowMissing: true,
  });

  const desc = Desc("resource", description);

  const notify = useNotify();

  return useLifecycle({
    validate: starbeam,
  }).render<{
    element: ReactiveElement;
    instance: T;
  }>(({ on, validate }, _, prev) => {
    const element = ReactiveElement.activate(
      notify,
      starbeam,
      desc,
      prev?.element
    );

    const nextInstance = setupFunction(() => callback(element));

    validate((nextStarbeam, prevStarbeam) => nextStarbeam === prevStarbeam);

    on.cleanup(() => {
      if (isObject(nextInstance)) {
        LIFETIME.finalize(nextInstance);
      }
    });

    on.layout(() => {
      ReactiveElement.layout(element);
    });

    on.idle(() => {
      ReactiveElement.idle(element);
    });

    return { element, instance: nextInstance };
  }).instance;
}

export function component<T>(
  callback: (setup: ReactiveElement) => () => T,
  description?: string | Description
): T {
  const desc = Desc("resource", description);

  const instance = useSetup(
    (setup) => PolledFormula(callback(setup), desc),
    desc.implementation("setup")
  );

  return useReactive(() => instance.read(), desc.implementation("current"));
}

export function Component<T>(
  callback: (setup: ReactiveElement) => () => T,
  description?: string | Description | undefined
): T;
export function Component<T, Args>(
  args: Args,
  callback: (setup: ReactiveElement) => (args: Args) => T,
  description?: string | Description | undefined
): T;
export function Component<T, Args>(
  ...options:
    | [
        args: Args,
        callback: (setup: ReactiveElement) => (args: Args) => T,
        description?: string | Description | undefined
      ]
    | [args: Args, callback: (setup: ReactiveElement) => (args: Args) => T]
    | [
        callback: (setup: ReactiveElement) => () => T,
        description?: string | Description | undefined
      ]
    | [callback: (setup: ReactiveElement) => () => T]
): T {
  const starbeam = useStarbeamApp({
    feature: "useSetup()",
    allowMissing: true,
  });

  const [args, callback, description] = Overload<
    [
      args: Args,
      callback: (setup: ReactiveElement) => (args: Args) => T,
      description?: string | Description | undefined
    ]
  >().resolve(options, {
    "1": (callback) => [undefined as unknown as Args, callback, undefined],
    "2": (argOrCallback, callbackOrDescription) => {
      if (typeof callbackOrDescription === "function") {
        return [argOrCallback, callbackOrDescription, undefined];
      } else {
        return [
          undefined as unknown as Args,
          argOrCallback as (setup: ReactiveElement) => (args: Args) => T,
          callbackOrDescription,
        ];
      }
    },
    "3": (args, callback, description) => [args, callback, description],
  });

  const desc = Desc("resource", description);

  const notify = useNotify();
  const reactiveArgs = useProp(args);

  const instance = useLifecycle({
    validate: starbeam,
    props: args,
  }).render<{
    element: ReactiveElement;
    instance: Reactive<T>;
  }>(({ on, validate }, _, prev) => {
    const element = ReactiveElement.activate(
      notify,
      starbeam,
      desc,
      prev?.element
    );

    const fn = setupFunction(() => callback(element));
    const instance = Formula(
      () => fn(reactiveArgs.current),
      desc.implementation("instance")
    );

    validate((nextStarbeam, prevStarbeam) => nextStarbeam === prevStarbeam);

    on.layout(() => {
      const unsubscribe = TIMELINE.on.change(instance, notify);
      on.cleanup(unsubscribe);

      // Run the layout callback *after* subscribing to the instance, so that
      // any changes to dependencies of the instance will cause us to notify
      // React.
      ReactiveElement.layout(element);
    });

    on.idle(() => {
      ReactiveElement.idle(element);
    });

    return { element, instance };
  }).instance;

  return unsafeTrackedElsewhere(() => instance.current);
}
