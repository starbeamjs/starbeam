import { Desc } from "@starbeam/debug";
import type { Description, Reactive } from "@starbeam/interfaces";
import { CONTEXT } from "@starbeam/timeline";

import { type IntoResource, Factory } from "./into.js";
import type { Blueprint } from "./reactive.js";
import type { ResourceFactory } from "./resource/resource.js";

export function Service<T>(
  create: Blueprint<T> | ResourceFactory<T>,
  description?: string | Description
): ServiceBlueprint<T> {
  return new ServiceBlueprint(create, Desc("blueprint:service", description));
}

Service.create = <T>(
  create: Blueprint<T> | ResourceFactory<T>,
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

function createService<T>(
  resource: IntoResource<T>,
  description: Description,
  app = CONTEXT.app
): Reactive<T> {
  return CONTEXT.create(resource, () =>
    Factory.resource(resource, app, description)
  );
}

export function service<T>(
  factory: Blueprint<T> | ResourceFactory<T>,
  description?: string | Description
): T {
  return createService(factory, Desc("service", description)).current;
}
