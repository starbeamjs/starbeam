import { isObject } from "@starbeam/core-utils";
import { type Description, descriptionFrom } from "@starbeam/debug";
import { LIFETIME, Reactive, TIMELINE } from "@starbeam/timeline";
import { type IntoReactiveObject, Factory } from "@starbeam/universal";
import {
  setupFunction,
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

import { ReactiveElement } from "./element.js";

export function useComponent(): object {
  return useLifecycle(({ on }) => {
    const owner = Object.create(null) as object;

    on.cleanup(() => {
      LIFETIME.finalize(owner);
    });

    return owner;
  });
}

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
      // const nextInstance = callback(element);

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
  callback: (setup: ReactiveElement) => IntoReactiveObject<T> | Reactive<T>,
  description?: string | Description
): T {
  const desc = descriptionFrom({
    type: "resource",
    api: "useReactiveSetup",
    fromUser: description,
  });

  const [, setNotify] = useState({});

  const instance = useLifecycle((lifecycle) => {
    const element = ReactiveElement.create(() => {
      setNotify({});
    }, desc);
    const nextInstance = unsafeTrackedElsewhere(() => callback(element));

    const setups = TIMELINE.on.change(element, () => {
      setNotify({});
    });

    lifecycle.on.update(() => {
      ReactiveElement.layout(element);
      ReactiveElement.idle(element);
    });

    lifecycle.on.cleanup(() => {
      if (isObject(nextInstance)) {
        LIFETIME.finalize(nextInstance);
      }
      LIFETIME.finalize(element);
    });

    lifecycle.on.idle(() => {
      ReactiveElement.idle(element);
    });

    const reactive = Factory.create(nextInstance);

    lifecycle.on.layout(() => {
      ReactiveElement.layout(element);

      if (Reactive.is(reactive)) {
        const unsubscribe = TIMELINE.on.change(reactive, () => {
          setNotify({});
        });

        lifecycle.on.cleanup(() => {
          unsubscribe();
          LIFETIME.finalize(setups);
        });
      }
    });

    return reactive;
  });

  if (Reactive.is(instance)) {
    return unsafeTrackedElsewhere(() => instance.read());
  } else {
    return instance;
  }
}
