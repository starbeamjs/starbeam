import { Resource } from "@starbeam/resource";
import { LIFETIME } from "@starbeam/runtime";
import { isPresent, verified } from "@starbeam/verify";

export const TestResource = Resource((r) => {
  const impl = TestResourceImpl.create();

  r.on.cleanup(() => {
    LIFETIME.finalize(impl);
  });

  return impl;
});

const INITIAL_ID = 0;

export const resources = {
  get nextId(): number {
    return TestResourceImpl.nextId;
  },

  get last(): TestResourceImpl {
    return TestResourceImpl.getLast();
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

    LIFETIME.on.cleanup(this, () => {
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
