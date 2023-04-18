import type { IntoResourceBlueprint } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";
import { service } from "@starbeam/service";

import { ReactApp, useStarbeamApp } from "./context-provider.js";
import { useReactive } from "./use-reactive.js";

export function useService<T>(blueprint: IntoResourceBlueprint<T>): T {
  CONTEXT.app = ReactApp.instance(useStarbeamApp({ feature: "useService()" }));

  const instance = service(blueprint);

  // We don't want to instantiate the service as a resource, because that would
  // cause it to be cleaned up when the component unmounts. Instead, we want to
  // keep it alive for the lifetime of the app.
  return useReactive(() => instance.read());
}
