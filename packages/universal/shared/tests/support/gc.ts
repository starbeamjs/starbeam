import { testing } from "@starbeam/shared";
import { expect } from "@starbeam-workspace/test-utils";

type UnregisterToken = object;

interface MockTarget<T> {
  readonly target: object;
  readonly heldValue: T;
  readonly unregisterToken: UnregisterToken | undefined;
}

let lastRegistry: MockFinalizationRegistry<string> | undefined;

class MockFinalizationRegistry<T> implements FinalizationRegistry<T> {
  #targets: MockTarget<T>[] = [];
  #callback: (heldValue: T) => void;

  readonly [Symbol.toStringTag] = "FinalizationRegistry";

  constructor(callback: (heldValue: T) => void) {
    this.#callback = callback;

    lastRegistry = this as unknown as MockFinalizationRegistry<string>;
  }

  register(
    target: object,
    heldValue: T,
    unregisterToken?: UnregisterToken | undefined,
  ): void {
    this.#targets.push({
      target,
      heldValue,
      unregisterToken,
    });
  }

  unregister(unregisterToken: object): void {
    this.#targets = this.#targets.filter(
      (target) => target.unregisterToken !== unregisterToken,
    );
  }

  gc(): void {
    const targets = this.#targets;
    this.#targets = [];

    for (const target of targets) {
      this.#callback(target.heldValue);
    }
  }
}

export function gc(): void {
  expect(lastRegistry, "the current testing GC registry").toBeDefined();
  lastRegistry?.gc();
}

testing({ registry: MockFinalizationRegistry });
