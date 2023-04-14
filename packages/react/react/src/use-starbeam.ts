import { isReactive, type ReadValue } from "@starbeam/reactive";
import { useLifecycle } from "@starbeam/use-strict-lifecycle";

import { useStarbeamApp } from "./context-provider.js";
import type {
  InternalStarbeamInstance,
  StarbeamInstance,
} from "./starbeam/instance.js";
import { activate } from "./starbeam/instance.js";
import { useReactive } from "./use-reactive.js";
import { sameDeps } from "./use-resource.js";

export function useStarbeam<T>(
  callback: (instance: StarbeamInstance) => T,
  deps?: unknown[] | undefined
): ReadValue<T> {
  const app = useStarbeamApp({ feature: "useStarbeam", allowMissing: true });

  const instance = useLifecycle({
    props: deps,
    validate: deps,
    with: sameDeps,
  }).render<{
    instance: T;
    starbeam: InternalStarbeamInstance;
  }>(({ on, notify }, deps, prev) => {
    const starbeam = activate({
      starbeam: prev?.starbeam,
      on,
      app,
      notify,
    });

    const instance = callback(starbeam);
    return { instance, starbeam };
  }).instance;

  return isReactive(instance)
    ? (useReactive(instance) as ReadValue<T>)
    : (instance as ReadValue<T>);
}
