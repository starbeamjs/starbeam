import type { Description } from "@starbeam/interfaces";
import { CachedFormula, Cell, DEBUG, type FormulaFn } from "@starbeam/reactive";
import type { FinalizationScope } from "@starbeam/runtime";
import { finalize, pushFinalizationScope } from "@starbeam/shared";

import { Resource, type ResourceBlueprint } from "./resource.js";

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
  },
): ResourceBlueprint<FormulaFn<T[]>> {
  // FIXME: This API feels like it should use the low-level sync API, not the
  // high-level resource API.
  return {
    setup: () => {
      let synced = false;

      const List = Resource(({ on }) => {
        const resources = new ResourceMap<T>(
          DEBUG?.Desc("collection", description),
        );

        const result: Resource<T>[] = [];
        for (const item of list) {
          const k = key(item);

          result.push(resources.create(k, map(item)));
        }

        const array = Cell(result);

        on.sync(() => {
          synced = true;
          const result: Resource<T>[] = [];
          const remaining = new Set();
          for (const item of list) {
            const k = key(item);
            remaining.add(k);
            const resource = resources.get(k);

            if (resource) {
              resource.sync();
              result.push(resource);
            } else {
              const created = resources.create(k, map(item));
              created.sync();
              result.push(created);
            }
          }

          resources.update(remaining);
          array.set(result);
        });

        return array;
      });

      const { sync, value: instance } = List.setup();
      return {
        sync,
        value: CachedFormula(() => {
          if (synced) sync();
          return instance.current.map((r) => r.value);
        }),
      };
    },
  };
}

type Key = string | number | { key: unknown; description: string | number };
type InternalMap<T> = Map<
  unknown,
  { resource: Resource<T>; scope: FinalizationScope }
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

  create(key: Key, resource: ResourceBlueprint<T>): Resource<T> {
    const done = pushFinalizationScope();
    const newResource = resource.setup();
    const scope = done();

    this.#map.set(key, { resource: newResource, scope });
    return newResource;
  }

  /**
   * Finalize any resources from the previous run that aren't in the resource
   * list anymore (based on their keys).
   */
  update(remaining: Set<unknown>): void {
    for (const [key, { scope }] of this.#map) {
      if (!remaining.has(key)) {
        finalize(scope);
        this.#map.delete(key);
      }
    }
  }
}
