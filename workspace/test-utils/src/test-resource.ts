import { Resource } from "@starbeam/resource";
import { finalize, onFinalize } from "@starbeam/shared";
import { isPresent, verified } from "@starbeam/verify";

import { type AnyFunction, entryPoint } from "./actions.js";

export const TestResource = Resource(({ on }) => {
  const impl = TestResourceImpl.create();

  on.finalize(() => {
    finalize(impl);
  });

  return impl;
});

const INITIAL_ID = 0;

export const resources = {
  get currentId(): number {
    return TestResourceImpl.currentId;
  },

  get nextId(): number {
    return TestResourceImpl.nextId;
  },

  get last(): TestResourceImpl {
    return entryPoint(() => TestResourceImpl.getLast(), {
      entryFn: Reflect.getOwnPropertyDescriptor(resources, "last")
        ?.get as AnyFunction,
      cause: `caller to 'last' was here`,
    });
  },

  get isActive(): boolean {
    return resources.last.isActive;
  },
};

export class TestResourceImpl {
  static #nextId = INITIAL_ID;
  static #last: TestResourceImpl | undefined;

  static get nextId(): number {
    return TestResourceImpl.#nextId;
  }

  static get currentId(): number {
    if (TestResourceImpl.#last === undefined) {
      throw Error(
        `You are attempting to get the current resource ID in testing, but no resource is active.`,
      );
    }

    return TestResourceImpl.#last.#id;
  }

  static getLast(): TestResourceImpl {
    return verified(TestResourceImpl.#last, isPresent);
  }

  static create(): TestResourceImpl {
    return new TestResourceImpl(TestResourceImpl.#nextId++);
  }

  #id: number;
  #active = true;

  constructor(id: number) {
    this.#id = id;
    TestResourceImpl.#last = this;

    onFinalize(this, () => {
      this.#active = false;
    });
  }

  get id(): number {
    return this.#id;
  }

  get isActive(): boolean {
    return this.#active;
  }
}
