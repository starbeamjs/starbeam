import { PolledFormulaFn } from "@starbeam/core";
import { isObject } from "@starbeam/core-utils";
import { type Description, descriptionFrom, Message } from "@starbeam/debug";
import { getID } from "@starbeam/peer";
import {
  isDebug,
  LIFETIME,
  Reactive,
  ReactiveProtocol,
  TIMELINE,
} from "@starbeam/timeline";
import {
  isRendering,
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";
import { useState } from "react";

import { ReactiveElement } from "./element.js";

let WARNED = false;

if (isDebug()) {
  TIMELINE.untrackedReadBarrier((reactive, stack) => {
    if (isRendering()) {
      if (!WARNED) {
        WARNED = true;

        const description = ReactiveProtocol.description(reactive).userFacing;
        const caller = stack.caller;

        const message = Message([
          [
            ["ERROR", "color:#f00", "font-weight:bold"],
            " ",
            [
              "You read from a reactive value but you were not inside the `useReactive` hook.",
              "color: #b00",
            ],
          ],
          "",
          [
            ["Created: ".padEnd(11, "…"), "color:#666"],
            " ",
            [description.fullName, "color:#6a6"],
          ],
          [
            [" ".repeat(11), "color:#666"],
            " ",
            [description.frame?.link() ?? "<unknown>", "color:#6a6"],
          ],
          [
            ["Accessed: ".padEnd(11, "…"), "color:#666"],
            " ",
            [caller?.link() ?? "<unknown>", "color:#6a6"],
          ],
          "",
          [
            [
              "This will prevent React from re-rendering when the reactive value changes.",
              "color:#b00",
            ],
          ],
          "",
          [
            [
              "Make sure that you are inside a `useReactive` hook whenever you access reactive state.",
              "color:#559",
            ],
          ],
          "",
          [
            [
              "You can wrap your entire component in `useReactive`, and return JSX to avoid this error. If you are also creating reactive cells in your component, you can use the `useSetup` hook to create cells and return JSX that reads from those cells.",
              "color:#559",
            ],
          ],
          "",
          [
            [
              "You can also use the `starbeam` HOC to create a component that automatically wraps your the entire body of your component in `useSetup`.",
              "color:#559",
            ],
          ],
        ]);

        console.warn(...message);

        console.groupCollapsed("Complete stack trace");
        console.log(stack.stack);
        console.groupEnd();

        throw Error(
          `You read from a reactive value, but you were not inside the \`useReactive\` hook.`
        );
      }
    }
  });
}

export function useSetup<T>(
  callback: (setup: ReactiveElement) => T,
  description?: string | Description
): T {
  const [, setNotify] = useState({});

  const desc = descriptionFrom({
    type: "resource",
    id: getID(),
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
    id: getID(),
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
