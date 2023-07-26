import type { Description } from "@starbeam/interfaces";
import { DEBUG } from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";

import {
  Resource,
  type ResourceBlueprint,
  setup,
  type SetupFnOptions,
  use,
} from "./api.js";

export function ResourceList<Item, T>(
  list: Iterable<Item>,
  {
    key,
    map,
    description,
  }: {
    key: (item: Item) => Key;
    map: (item: Item) => ResourceBlueprint<T>;
    description?: string | Description;
  }
): ResourceBlueprint<Resource<T>[]> {
  const resources = new ResourceMap<T>(DEBUG?.Desc("collection", description));
  const lifetime = {};

  return Resource(({ on }) => {
    on.finalize(() => {
      RUNTIME.finalize(lifetime);
    });

    on.setup(() => {
      resources.setup();
    });

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
  });
}

type Key = string | number | { key: unknown; description: string | number };
type InternalMap<T> = Map<
  unknown,
  { resource: Resource<T>; lifetime: object; isSetup: boolean }
>;

class ResourceMap<T> {
  readonly #map: InternalMap<T> = new Map();
  readonly #description: Description | undefined;

  constructor(description: Description | undefined) {
    this.#description = description;
  }

  get(key: unknown): Resource<T> | undefined {
    return this.#map.get(key)?.resource;
  }

  create(
    key: Key,
    resource: ResourceBlueprint<T>,
    options: SetupFnOptions
    // parentLifetime: object
  ): Resource<T> {
    const lifetime = {};
    RUNTIME.link(options.lifetime, lifetime);
    const newResource = use(resource, {
      description: this.#description?.key(
        typeof key === "object"
          ? { key: key.key, name: String(key.description) }
          : key
      ),
    });
    this.#map.set(key, { resource: newResource, lifetime, isSetup: false });
    return newResource;
  }

  setup() {
    for (const state of this.#map.values()) {
      if (state.isSetup) continue;

      setup(state.resource, { lifetime: state.lifetime });
      state.isSetup = true;
    }
  }

  /**
   * Finalize any resources from the previous run that aren't in the resource
   * list anymore (based on their keys).
   */
  update(remaining: Set<unknown>): void {
    for (const [key, { lifetime }] of this.#map) {
      if (!remaining.has(key)) {
        RUNTIME.finalize(lifetime);
        this.#map.delete(key);
      }
    }
  }
}
