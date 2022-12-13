import { CONTEXT } from "@starbeam/timeline";
import {
  type Blueprint,
  type ResourceFactory,
  service,
} from "@starbeam/universal";

import { ReactApp, useStarbeamApp } from "./context-provider.js";
import { useReactive } from "./use-reactive.js";

export function useService<T>(factory: Blueprint<T> | ResourceFactory<T>): T {
  CONTEXT.app = ReactApp.instance(useStarbeamApp({ feature: "useService()" }));

  // We don't want to instantiate the service as a resource, because that would
  // cause it to be cleaned up when the component unmounts. Instead, we want to
  // keep it alive for the lifetime of the app.
  return useReactive(() => service(factory));
}
