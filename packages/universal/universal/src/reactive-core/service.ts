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
  const desc = Desc("blueprint:service", description);
  return new ServiceBlueprint(create, desc);
}

Service.create = <T>(
  create: Blueprint<T> | ResourceFactory<T>
): Reactive<T> => {
  return Service(create).create();
};

export class ServiceBlueprint<T> {
  #create: IntoResource<T>;
  #description: Description;

  constructor(create: IntoResource<T>, description: Description) {
    this.#create = create;
    this.#description = description;
  }

  create(): Reactive<T> {
    return CONTEXT.create(this.#create, () =>
      Factory.resource(this.#create, CONTEXT.app)
    );
  }
}
