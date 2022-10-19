import { Desc } from "@starbeam/debug";
import type { Description, Reactive } from "@starbeam/interfaces";
import { CONTEXT } from "@starbeam/timeline";

import { Factory } from "./reactive.js";

export function Service<T>(
  create: Factory<T>,
  description?: string | Description
): ServiceBlueprint<T> {
  const desc = Desc("blueprint:service", description);
  return new ServiceBlueprint(create, desc);
}

Service.create = <T>(create: Factory<T>): Reactive<T> => {
  return Service(create).create();
};

export class ServiceBlueprint<T> {
  #create: Factory<T>;
  #description: Description;

  constructor(create: Factory<T>, description: Description) {
    this.#create = create;
    this.#description = description;
  }

  create(): Reactive<T> {
    return CONTEXT.create(this.#create, () =>
      Factory.create(this.#create, CONTEXT.app)
    );
  }
}
