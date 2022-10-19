import { PolledFormulaFn } from "@starbeam/core";
import { isObject } from "@starbeam/core-utils";
import { type Description, descriptionFrom } from "@starbeam/debug";
import { LIFETIME, Reactive, TIMELINE } from "@starbeam/timeline";
import {
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

import { ReactiveElement } from "./element.js";

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
        : ReactiveElement.create(() => setNotify({}), desc);
      const instance = callback(element);

      lifecycle.on.cleanup(() => {
        if (isObject(instance)) {
          LIFETIME.finalize(instance);
        }
      });

      lifecycle.on.layout(() => {
        ReactiveElement.layout(element);
      });

      lifecycle.on.idle(() => {
        ReactiveElement.idle(element);
      });

      return { element, instance };
    }
  );

  return instance;
}

export function useReactiveSetup<T>(
  callback: (setup: ReactiveElement) => () => T,
  description?: string | Description
): T;
export function useReactiveSetup<T>(
  callback: (setup: ReactiveElement) => Reactive<T>,
  description?: string | Description
): T;
export function useReactiveSetup<T>(
  callback: (setup: ReactiveElement) => (() => T) | Reactive<T>,
  description?: string | Description
): T {
  const desc = descriptionFrom({
    type: "resource",
    api: "useReactiveSetup",
    fromUser: description,
  });

  const [, setNotify] = useState({});

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const instance = useLifecycle((lifecycle) => {
    const element = ReactiveElement.create(() => setNotify({}), desc);
    const instance = unsafeTrackedElsewhere(() => callback(element));

    const setups = TIMELINE.on.change(element, () => {
      setNotify({});
    });

    lifecycle.on.update(() => {
      ReactiveElement.layout(element);
      ReactiveElement.idle(element);
    });

    lifecycle.on.cleanup(() => {
      if (isObject(instance)) {
        LIFETIME.finalize(instance);
      }
      LIFETIME.finalize(element);
    });

    lifecycle.on.idle(() => {
      ReactiveElement.idle(element);
    });

    let reactive: Reactive<T>;
    if (Reactive.is(instance)) {
      reactive = instance;
    } else {
      reactive = PolledFormulaFn(instance, desc);
    }

    lifecycle.on.layout(() => {
      ReactiveElement.layout(element);

      const unsubscribe = TIMELINE.on.change(reactive, () => {
        setNotify({});
      });

      lifecycle.on.cleanup(() => {
        unsubscribe();
        LIFETIME.finalize(setups);
      });
    });

    return reactive;
  });

  return unsafeTrackedElsewhere(() => instance.read());
}
