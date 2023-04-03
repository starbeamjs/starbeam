import { Desc } from "@starbeam/debug";
import type { Description, Reactive } from "@starbeam/interfaces";
import { Resource, type ResourceBlueprint } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";

import { Factory, type IntoResource } from "./into.js";
import { type Blueprint } from "./reactive.js";

export function Service<T>(
  blueprint: Blueprint<T>,
  description?: string | Description
): ResourceBlueprint<T> | ResourceBlueprint<Reactive<T>> {
  return Resource(({ use }) => {
    return CONTEXT.create(blueprint, () => {
      return use(blueprint);
    });
  }, Desc("blueprint:service", description).detail("service"));
}

Service.create = <T>(
  create: Blueprint<T>,
  description?: string | Description
): Reactive<T> => {
  return createService(create, Desc("service", description));
};

export class ServiceBlueprint<T> {
  #create: IntoResource<T>;
  #description: Description;

  constructor(create: IntoResource<T>, description: Description) {
    this.#create = create;
    this.#description = description;
  }

  create(): Reactive<T> {
    return createService(this.#create, this.#description);
  }
}

export function createService<T>(
  resource: IntoResource<T>,
  description: Description,
  app = CONTEXT.app
): Reactive<T> {
  CONTEXT.app = app;
  return CONTEXT.create(resource, () =>
    Factory.resource(resource, app, description)
  );
}

export function reactiveService<T>(
  factory: Blueprint<T> | ResourceBlueprint<T>,
  description?: string | Description
): Reactive<T> {
  return createService(factory, Desc("service", description));
}

export function service<T>(
  factory: Blueprint<T>,
  description?: string | Description
): T {
  return createService(factory, Desc("service", description)).current;
}
