import type { Description } from "@starbeam/interfaces";
import { RUNTIME } from "@starbeam/reactive";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { Resource, type ResourceBlueprint, use } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";

type Blueprint<T> = IntoResourceBlueprint<T, void>;

export function Service<T>(
  blueprint: Blueprint<T>,
  description?: string | Description
): ResourceBlueprint<T, void> {
  return Resource(({ use }) => {
    return CONTEXT.create(blueprint, () => {
      return use(blueprint);
    });
  }, RUNTIME.Desc?.("service", description));
}

export function service<T>(
  resource: Blueprint<T>,
  description?: string | Description
): Resource<T> {
  return use(Service(resource, RUNTIME.Desc?.("service", description)), {
    lifetime: CONTEXT.app,
  });
}
