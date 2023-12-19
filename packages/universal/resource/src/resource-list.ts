import type { Description } from "@starbeam/interfaces";
import type { FormulaFn } from "@starbeam/reactive";
import { CachedFormula, Cell, DEBUG } from "@starbeam/reactive";
import type { FinalizationScope } from "@starbeam/runtime";
import { finalize, pushFinalizationScope } from "@starbeam/shared";

import type { Resource, ResourceBlueprint } from "./resource.js";
import { SyncTo } from "./sync/high-level.js";

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
  return {
    setup: () => {
      const List = SyncTo(({ on }) => {
        const resources = new ResourceMap<T>(
          DEBUG?.Desc("collection", description),
        );

        // initialize the array eagerly by mapping the existing items over the
        // mapper, running their setup functions (but not syncing yet).
        const array = Cell(
          [...list].map((item) => resources.setup(key(item), map(item))),
        );

        on.sync(() => {
          const remaining = new Set();

          const result = [...list].map((item) => {
            const k = key(item);
            remaining.add(k);
            return resources.upsert(k, () => map(item));
          });

          array.set(result);
        });

        return array;
      });

      const { sync: syncArrays, value: resourceArray } = List.setup();
      return {
        // getting the value of a resource list eagerly syncs the arrays but
        // doesn't eagerly run the setup function.
        value: CachedFormula(() => {
          syncArrays();
          return resourceArray.current.map((r) => r.value);
        }),
        // The sync formula of a resource list syncs the arrays and *also*
        // syncs the elements of the array. Renderers subscribe to this formula
        // in order to sync inside of the framework-appropriate synchronizer
        // (e.g. useEffect in React).
        sync: CachedFormula(() => {
          syncArrays();
          resourceArray.current.forEach((r) => {
            r.sync();
          });
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
  // eslint-disable-next-line no-unused-private-class-members -- @todo
  readonly #description: Description | undefined;

  constructor(description: Description | undefined) {
    this.#description = description;
  }

  upsert(key: Key, insert: () => ResourceBlueprint<T>) {
    let resource = this.get(key);

    if (!resource) resource = this.setup(key, insert());

    return resource;
  }

  get(key: unknown): Resource<T> | undefined {
    return this.#map.get(key)?.resource;
  }

  setup(key: Key, resource: ResourceBlueprint<T>): Resource<T> {
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
