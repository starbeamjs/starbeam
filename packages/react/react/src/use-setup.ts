import { callerStack, Desc } from "@starbeam/debug";
import type { Description } from "@starbeam/interfaces";
import { isReactive } from "@starbeam/timeline";
import type { Reactive } from "@starbeam/universal";
import { PolledFormula } from "@starbeam/universal";
import {
  setupFunction,
  unsafeTrackedElsewhere,
  useLifecycle,
} from "@starbeam/use-strict-lifecycle";

import { useStarbeamApp } from "./context-provider.js";
import { ReactiveElement } from "./element.js";
import { useNotify } from "./use-reactive.js";

export type UseSetupConstructor<Props, T> = (
  setup: ReactiveElement
) => (props: Props) => T;

export type RenderFn = (props: unknown) => unknown;

interface UseSetupState {
  element: ReactiveElement;
  instance:
    | { type: "compute"; value: (props: unknown) => unknown }
    | { type: "reactive"; value: Reactive<unknown> }
    | { type: "static"; value: unknown };
}

export function useSetup<
  C extends (setup: ReactiveElement) => Reactive<unknown>
>(callback: C, description?: string | Description): ReturnType<C>["current"];
export function useSetup<
  C extends (setup: ReactiveElement) => RenderFn,
  RenderFn extends (props: never) => unknown
>(callback: C, description?: string | Description): { compute: ReturnType<C> };
export function useSetup<C extends (setup: ReactiveElement) => unknown>(
  callback: C,
  description?: string | Description
): ReturnType<C>;
export function useSetup<
  C extends (setup: ReactiveElement) => RenderFn,
  RenderFn
>(callback: C, description?: string | Description): unknown {
  const starbeam = useStarbeamApp({
    feature: "useSetup()",
    allowMissing: true,
  });

  const desc = Desc("resource", description);

  const notify = useNotify();

  const { instance } = useLifecycle({
    validate: starbeam,
  }).render<UseSetupState>(({ on, validate }, _, prev) => {
    const element = ReactiveElement.activate(
      notify,
      starbeam,
      desc,
      prev?.element
    );

    const instance = setupFunction(() => callback(element));

    validate((nextStarbeam, prevStarbeam) => nextStarbeam === prevStarbeam);

    on.layout(() => {
      ReactiveElement.layout(element);
    });

    on.idle(() => {
      ReactiveElement.idle(element);
    });

    let currentProps: unknown = undefined;

    if (isReactive(instance)) {
      ReactiveElement.subscribe(element, instance);
      return { element, instance: { type: "reactive", value: instance } };
    } else if (typeof instance === "function") {
      const reactive = PolledFormula(() => {
        return (instance as (props: unknown) => unknown)(currentProps);
      }, desc);
      ReactiveElement.subscribe(element, reactive);
      function compute(props: unknown, caller = callerStack()): unknown {
        currentProps = props;
        return reactive.read(caller);
      }

      return { element, instance: { type: "compute", value: compute } };
    } else {
      return { element, instance: { type: "static", value: instance } };
    }
  });

  switch (instance.type) {
    case "compute":
      return { compute: instance.value };
    case "reactive":
      return unsafeTrackedElsewhere(() => instance.value.read());
    case "static":
      return instance.value;
  }
}
