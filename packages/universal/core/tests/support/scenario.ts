import { describe, test } from "@starbeam-workspace/test-utils";
import type { Awaitable } from "vitest";

export function scenario<T>(
  description: string,
  setup: () => Awaitable<T>
): Scenario<T> {
  const scenario = new Scenario(setup);
  queueMicrotask(() => Scenario.finalize(scenario, description));
  return scenario;
}

interface TestFn<T> {
  (value: T): Awaitable<(() => Awaitable<void>)[] | void>;
}

interface TestDefinition<T> {
  description: string;
  fn: TestFn<T>;
}

class Scenario<T> {
  static finalize<T>(scenario: Scenario<T>, description: string): void {
    describe(description, () => {
      for (const definition of scenario.#definitions) {
        test(definition.description, async () => {
          const value = await scenario.#setup();
          const more = (await definition.fn(value)) ?? [];

          const [first, ...rest] = more;

          if (first) {
            await first();
          }

          for (let i = 0; i < rest.length; i++) {
            const value = await scenario.#setup();
            const newMore = (await definition.fn(
              value
            )) as (() => Awaitable<void>)[];
            const next = newMore[i + 1] as () => Awaitable<void>;
            await next();
          }
        });
      }
    });
  }

  readonly #setup: () => Awaitable<T>;
  readonly #definitions: TestDefinition<T>[] = [];

  constructor(setup: () => Awaitable<T>) {
    this.#setup = setup;
  }

  test(description: string, fn: TestFn<T>): Scenario<T> {
    this.#definitions.push({ description, fn });
    return this;
  }
}
