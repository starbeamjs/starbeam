import type { Description } from "@starbeam/interfaces";
import { DEBUG } from "@starbeam/reactive";
import type { IntoResourceBlueprint } from "@starbeam/resource";
import { Resource, type ResourceBlueprint, setup } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";

type Blueprint<T> = IntoResourceBlueprint<T>;

/**
 * The `Service` function takes a resource blueprint and turns it into a
 * service: a resource that is created once and then shared across all
 * components rendered within a given app instance.s
 */
export function Service<T>(
  blueprint: Blueprint<T>,
  {
    description,
    app = CONTEXT.app,
  }: { description?: string | Description | undefined; app?: object } = {}
): ResourceBlueprint<T> {
  return Resource(({ use }) => {
    return CONTEXT.create(
      blueprint,
      () => {
        return use(blueprint);
      },
      { app }
    );
  }, DEBUG?.Desc("service", description));
}

export function service<T>(
  resource: Blueprint<T>,
  {
    description,
    app = CONTEXT.app,
  }: {
    description?: string | Description | undefined;
    app?: object | undefined;
  } = {}
): Resource<T> {
  return setup(
    Service(resource, {
      description: DEBUG?.Desc("service", description),
      app,
    }),
    { lifetime: app }
  );
}
