import { type IntoResourceBlueprint, type Resource } from "@starbeam/resource";
import { service as starbeamService } from "@starbeam/service";

import { ReactApp, useStarbeamApp } from "./context-provider.js";
import { setup, useReactive } from "./use-reactive.js";

export function setupService<T>(
  blueprint: IntoResourceBlueprint<T>
): Resource<T> {
  return starbeamService(blueprint, {
    app: ReactApp.instance(useStarbeamApp({ feature: "useService()" })),
  });
}

export function useService<T>(blueprint: IntoResourceBlueprint<T>): T {
  const instance = setupService(blueprint);

  return useReactive(() => instance.read());
}

export function setupResource<T>(
  blueprint: IntoResourceBlueprint<T>
): Resource<T> {
  return setup(({ use }) => use(blueprint));
}

export function useResource<T>(blueprint: IntoResourceBlueprint<T>): T {
  const instance = setupResource(blueprint);

  return useReactive(() => instance.read());
}
