import { Resource } from "@starbeam/resource";
import { RUNTIME } from "@starbeam/runtime";
import { isPresent, verified } from "@starbeam/verify";

export const TestResource = Resource((r) => {
  const impl = TestResourceImpl.create();

  r.on.cleanup(() => {
    RUNTIME.finalize(impl);
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

  static get currentId(): number {
    if (TestResourceImpl.#last === undefined) {
      throw Error(
        `You are attempting to get the current resource ID in testing, but no resource is active.`
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

    RUNTIME.onFinalize(this, () => {
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
