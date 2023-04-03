import { Desc } from "@starbeam/debug";
import type { Description } from "@starbeam/interfaces";
import { Resource, type ResourceBlueprint, use } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";

type Blueprint<T> = ResourceBlueprint<T, void>;

export function Service<T>(
  blueprint: Blueprint<T>,
  description?: string | Description
): ResourceBlueprint<T, void> {
  return Resource(({ use }) => {
    return CONTEXT.create(blueprint, () => {
      return use(blueprint);
    });
  }, Desc("blueprint:service", description).detail("service"));
}

export function service<T>(
  resource: Blueprint<T>,
  description?: string | Description
): Resource<T> {
  return use(Service(resource, Desc("blueprint:resource", description)), {
    lifetime: CONTEXT.app,
  });
}
