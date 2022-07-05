import { type DescriptionArgs, Stack, Description } from "@starbeam/debug";
import { type ReactiveInternals, LIFETIME, REACTIVE } from "@starbeam/timeline";

import type { Reactive } from "../../reactive.js";
import { Formula } from "../formula/formula.js";
import { Linkable } from "../formula/linkable.js";
import type { Resource } from "../formula/resource.js";

type Key = unknown;
type Entry<T> = [Key, T];

class ReactiveResourceList<T, U> implements Reactive<U[]> {
  static create<T, U>(
    this: void,
    iterable: Iterable<T>,
    {
      key,
      resource,
    }: {
      key: (item: T) => Key;
      resource: (item: T) => Linkable<Resource<U>>;
    },
    desc?: string | Description
  ): Linkable<ResourceList<U>> {
    const formula = Formula(() =>
      [...iterable].map((item): [Key, T] => [key(item), item])
    );

    const description = Stack.description({
      type: "collection:value",
      api: {
        package: "@starbeam/core",
        name: "ResourceList",
      },
      fromUser: desc,
    });

    return Linkable.create((owner) => {
      const list = new ReactiveResourceList(formula, resource, description);
      LIFETIME.link(owner, list);
      return list as ResourceList<U>;
    });
  }

  #last: Entry<T>[] | undefined;
  #map: Map<Key, Resource<U>> | undefined;

  readonly #inputs: Formula<Entry<T>[]>;
  readonly #resource: (item: T) => Linkable<Resource<U>>;
  readonly #description: DescriptionArgs;

  readonly #outputs: Formula<U[]>;

  constructor(
    iterable: Formula<Entry<T>[]>,
    resource: (item: T) => Linkable<Resource<U>>,
    description: DescriptionArgs
  ) {
    this.#inputs = iterable;

    this.#map = undefined;
    this.#last = undefined;

    this.#resource = resource;
    this.#description = description;

    this.#map = this.#update();

    this.#outputs = Formula(() => {
      this.#map = this.#update();

      return [...this.#map.values()].map((formula) => formula.current);
    });
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#outputs[REACTIVE];
  }

  get current(): U[] {
    return this.read(Stack.fromCaller());
  }

  read(caller: Stack): U[] {
    return this.#outputs.read(caller);
  }

  #update(): Map<Key, Resource<U>> {
    const next = this.#inputs.current;

    if (this.#map !== undefined && this.#last === next) {
      return this.#map;
    }

    this.#last = next;

    const map: Map<Key, Resource<U>> = new Map();

    for (const [key, item] of next) {
      const formula = this.#map?.get(key);

      if (formula === undefined) {
        const linkable = this.#resource(item);
        const resource = linkable.create({ owner: this });

        map.set(key, resource);
      } else {
        map.set(key, formula);
      }
    }

    if (this.#map) {
      for (const [key, formula] of this.#map) {
        if (!map.has(key)) {
          LIFETIME.finalize(formula);
        }
      }
    }

    return map;
  }
}

export type ResourceList<U> = ReactiveResourceList<unknown, U>;
export const ResourceList = ReactiveResourceList.create;
