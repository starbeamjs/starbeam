import type { Reactive, ReactiveValue } from "@starbeam/interfaces";
import { CachedFormula, Formula, type ReadValue } from "@starbeam/reactive";
import { LIFETIME } from "@starbeam/runtime";

import { Resource, type ResourceBlueprint, use } from "./resource.js";

export function ResourceList<T, R>(
  list: Iterable<T>,
  {
    key,
    map,
  }: {
    key: (item: T) => unknown;
    map: (item: T) => ResourceBlueprint<R>;
  }
): ResourceBlueprint<Resource<ReadValue<R>>[]> {
  const resources = new ResourceMap<R>();

  return Resource((_run, _metadata, lifetime) => {
    const result: Resource<ReadValue<R>>[] = [];
    const remaining = new Set();
    for (const item of list) {
      const k = key(item);
      remaining.add(k);
      const resource = resources.get(k);

      if (resource) {
        result.push(resource);
      } else {
        result.push(resources.create(k, map(item), lifetime));
      }
    }

    resources.update(remaining);

    return result;
  });
}

type InternalMap<R> = Map<
  unknown,
  { resource: Resource<ReadValue<R>>; lifetime: object }
>;

class ResourceMap<R> {
  readonly #map: InternalMap<R> = new Map();

  get(key: unknown): Resource<ReadValue<R>> | undefined {
    return this.#map.get(key)?.resource;
  }

  create(
    key: unknown,
    resource: ResourceBlueprint<R>,
    parentLifetime: object
  ): Resource<ReadValue<R>> {
    const lifetime = {};
    LIFETIME.link(parentLifetime, lifetime);
    const newResource = use(resource, {
      lifetime,
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

export function FormulaList<T, U>(
  list: Iterable<T>,
  {
    key,
    map,
  }: {
    key: (item: T) => unknown;
    map: (item: T) => U;
  }
): Reactive<U[]> {
  const prev = new Map<unknown, ReactiveValue<U>>();

  return Formula(() => {
    const result: U[] = [];
    for (const item of list) {
      const k = key(item);
      const r = prev.get(k);
      if (r) {
        result.push(r.read());
      } else {
        const newR = CachedFormula(() => map(item));
        result.push(newR.current);
        prev.set(k, newR);
      }
    }
    return result;
  });
}
