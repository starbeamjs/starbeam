import { isObject } from "@starbeam/core-utils";
import { type Description, descriptionFrom } from "@starbeam/debug";
import { LIFETIME } from "@starbeam/timeline";
import { PolledFormula } from "@starbeam/universal";
import { setupFunction, useLifecycle } from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

import { ReactiveElement } from "./element.js";
import { useReactive } from "./use-reactive.js";

/**
 * Create a stable object that will automatically be cleaned up when the
 * component is unmounted, **including** when the component is unmounted
 * temporarily (i.e. when state is [reused] by React).
 *
 * [reused]: https://github.com/reactwg/react-18/discussions/19
 */
export function useComponent(): object {
  return useLifecycle(({ on }) => {
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
  const [, setNotify] = useState({});

  const desc = descriptionFrom({
    type: "resource",
    api: {
      package: "@starbeam/react",
      name: "useSetup",
    },
    fromUser: description,
  });

  const { instance } = useLifecycle<{ element: ReactiveElement; instance: T }>(
    (lifecycle, prev) => {
      const element = prev?.element
        ? ReactiveElement.reactivate(prev.element)
        : ReactiveElement.create(() => {
            setNotify({});
          }, desc);

      const nextInstance = setupFunction(() => callback(element));

      lifecycle.on.cleanup(() => {
        if (isObject(nextInstance)) {
          LIFETIME.finalize(nextInstance);
        }
      });

      lifecycle.on.layout(() => {
        ReactiveElement.layout(element);
      });

      lifecycle.on.idle(() => {
        ReactiveElement.idle(element);
      });

      return { element, instance: nextInstance };
    }
  );

  return instance;
}

export function useReactiveSetup<T>(
  callback: (setup: ReactiveElement) => () => T,
  description?: string | Description
): T {
  const desc = descriptionFrom({
    type: "resource",
    api: "useReactiveSetup",
    fromUser: description,
  });

  const instance = useSetup((setup) => {
    return PolledFormula(callback(setup), desc);
  }, desc);

  return useReactive(() => instance.read());
}
