import { PolledFormula, Reactive } from "@starbeam/core";
import { isObject } from "@starbeam/core-utils";
import { type Description, descriptionFrom, Message } from "@starbeam/debug";
import { isDebug, LIFETIME, TIMELINE } from "@starbeam/timeline";
import { isRendering, useLifecycle } from "@starbeam/use-strict-lifecycle";
import { unsafeTrackedElsewhere } from "@starbeam/use-strict-lifecycle/src/react.js";
import { useState } from "react";

import { ReactiveElement } from "./element.js";

let WARNED = false;

if (isDebug()) {
  TIMELINE.untrackedReadBarrier((reactive, stack) => {
    if (isRendering()) {
      if (!WARNED) {
        WARNED = true;

        const description = Reactive.description(reactive).userFacing;
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
            [description.frame?.link ?? "<unknown>", "color:#6a6"],
          ],
          [
            ["Accessed: ".padEnd(11, "…"), "color:#666"],
            " ",
            [caller?.link ?? "<unknown>", "color:#6a6"],
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

export function useSetup<T>(callback: (setup: ReactiveElement) => T): T {
  const [, setNotify] = useState({});

  return useLifecycle((lifecycle) => {
    const builder = ReactiveElement.create(() => setNotify({}));
    const instance = callback(builder);

    lifecycle.on.cleanup(() => {
      if (isObject(instance)) {
        LIFETIME.finalize(instance);
      }
    });

    lifecycle.on.layout(() => {
      ReactiveElement.layout(builder);
    });

    lifecycle.on.idle(() => {
      ReactiveElement.idle(builder);
    });

    return instance;
  });
}

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

  const instance = useLifecycle((lifecycle) => {
    const builder = ReactiveElement.create(() => setNotify({}));
    const instance = unsafeTrackedElsewhere(() => callback(builder));

    lifecycle.on.cleanup(() => {
      if (isObject(instance)) {
        LIFETIME.finalize(instance);
      }
    });

    lifecycle.on.idle(() => {
      ReactiveElement.idle(builder);
    });

    let reactive: Reactive<T>;
    if (Reactive.is(instance)) {
      reactive = instance;
    } else {
      reactive = PolledFormula(instance, desc);
    }

    lifecycle.on.layout(() => {
      ReactiveElement.layout(builder);

      const renderer = TIMELINE.on.change(reactive, () => {
        setNotify({});
      });

      lifecycle.on.cleanup(() => {
        LIFETIME.finalize(renderer);
      });
    });

    return reactive;
  });

  return unsafeTrackedElsewhere(() => instance.current);
}
