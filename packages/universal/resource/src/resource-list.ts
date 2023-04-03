import { Desc, type Description } from "@starbeam/debug";
import { LIFETIME } from "@starbeam/runtime";

import {
  Resource,
  type ResourceBlueprint,
  use,
  type UseFnOptions,
} from "./api.js";

export function ResourceList<Item, T>(
  list: Iterable<Item>,
  {
    key,
    map,
    description,
  }: {
    key: (item: Item) => Key;
    map: (item: Item) => ResourceBlueprint<T, void>;
    description?: string | Description;
  }
): ResourceBlueprint<Resource<T>[], void> {
  const resources = new ResourceMap<T, void>(Desc("collection", description));

  return Resource((_run, _metadata, lifetime) => {
    const result: Resource<T>[] = [];
    const remaining = new Set();
    for (const item of list) {
      const k = key(item);
      remaining.add(k);
      const resource = resources.get(k);

      if (resource) {
        result.push(resource);
      } else {
        result.push(resources.create(k, map(item), { lifetime }));
      }
    }

    resources.update(remaining);

    return result;
  }) as ResourceBlueprint<Resource<T>[]>;
}

type Key = string | number | { key: unknown; description: string | number };
type InternalMap<T> = Map<unknown, { resource: Resource<T>; lifetime: object }>;

class ResourceMap<T, M> {
  readonly #map: InternalMap<T> = new Map();
  readonly #description: Description;

  constructor(description: Description) {
    this.#description = description;
  }

  get(key: unknown): Resource<T> | undefined {
    return this.#map.get(key)?.resource;
  }

  create(
    key: Key,
    resource: ResourceBlueprint<T>,
    options: UseFnOptions<M>
    // parentLifetime: object
  ): Resource<T> {
    const lifetime = {};
    LIFETIME.link(options.lifetime, lifetime);
    const newResource = use(resource, {
      lifetime,
      metadata: options.metadata,
      description: this.#description.key(String(key)),
    });
    this.#map.set(key, { resource: newResource, lifetime });
    return newResource;
  }

  /**
   * Finalize any resources from the previous run that aren't in the resource
   * list anymore (based on their keys).
   */
  update(remaining: Set<unknown>): void {
    for (const [key, { lifetime }] of this.#map) {
      if (!remaining.has(key)) {
        LIFETIME.finalize(lifetime);
        this.#map.delete(key);
      }
    }
  }
}
