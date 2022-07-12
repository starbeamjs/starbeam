import {
  type Description,
  type DescriptionArgs,
  callerStack,
  descriptionFrom,
  Stack,
} from "@starbeam/debug";
import { type ReactiveInternals, LIFETIME, REACTIVE } from "@starbeam/timeline";
import { expected, isEqual, verify } from "@starbeam/verify";

import type { Reactive } from "../../reactive.js";
import { Formula } from "../formula/formula.js";
import { Linkable } from "../formula/linkable.js";
import { type CreateResource, Resource } from "../formula/resource.js";

type Key = unknown;
type Entry<T> = [Key, T];

export interface CreateResourceList<T> {
  create(this: void, options: { owner: object }): ResourceList<T>;
}

class ReactiveResourceList<T, U> implements Reactive<U[]> {
  static create<T, U>(
    this: void,
    iterable: Iterable<T>,
    {
      key,
      resource,
    }: {
      key: (item: T) => Key;
      resource: (item: T) => CreateResource<U>;
    },
    desc?: string | Description
  ): CreateResourceList<U> {
    const formula = Formula(() =>
      [...iterable].map((item): [Key, T] => [key(item), item])
    );

    const description = descriptionFrom({
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

  static setup<T, U>(
    this: void,
    list: ReactiveResourceList<T, U>,
    caller: Stack
  ): void {
    verify(
      list.#setup,
      isEqual(false),
      expected("setup handler").toBe("setup only once").butGot("a second run")
    );

    list.#setup = true;

    if (list.#map) {
      for (const resource of list.#map.values()) {
        Resource.setup(resource, caller);
      }
    }
  }

  #last: Entry<T>[] | undefined;
  #map: Map<Key, Resource<U>> | undefined;

  readonly #inputs: Formula<Entry<T>[]>;
  readonly #resource: (item: T) => CreateResource<U>;
  readonly #outputs: Formula<U[]>;
  readonly #description: DescriptionArgs;

  #setup = false;

  constructor(
    iterable: Formula<Entry<T>[]>,
    resource: (item: T) => CreateResource<U>,
    description: Description
  ) {
    this.#inputs = iterable;

    this.#map = undefined;
    this.#last = undefined;

    this.#resource = resource;
    this.#description = description;

    this.#map = this.#initialize();

    this.#outputs = Formula(() => {
      this.#map = this.#initialize();

      return [...this.#map.values()].map((formula) => formula.current);
    }, description);
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#outputs[REACTIVE];
  }

  get current(): U[] {
    return this.read(callerStack());
  }

  read(caller: Stack): U[] {
    return this.#outputs.read(caller);
  }

  #initialize(): Map<Key, Resource<U>> {
    return this.#update(Stack.EMPTY);
  }

  #update(caller: Stack): Map<Key, Resource<U>> {
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

        if (this.#setup) {
          Resource.setup(resource, caller);
        }
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

export const ResourceList = <T, U>(
  iterable: Iterable<T>,
  options: {
    key: (item: T) => Key;
    resource: (item: T) => CreateResource<U>;
  },
  desc?: string | Description
): CreateResourceList<U> => {
  return ReactiveResourceList.create(iterable, options, desc);
};

ResourceList.setup = ReactiveResourceList.setup;
