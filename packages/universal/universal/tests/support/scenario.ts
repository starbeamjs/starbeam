import { describe, test } from "@starbeam-workspace/test-utils";
import type { Awaitable } from "vitest";

export function scenario<T>(
  description: string,
  setup: () => Awaitable<T>
): Scenario<T> {
  const s = new Scenario(setup);
  queueMicrotask(() => {
    Scenario.finalize(s, description);
  });
  return s;
}

type TestFn<T> = (value: T) => Awaitable<(() => Awaitable<void>)[] | undefined>;

interface TestDefinition<T> {
  description: string;
  fn: TestFn<T>;
}

class Scenario<T> {
  static finalize<T>(s: Scenario<T>, description: string): void {
    describe(description, () => {
      for (const definition of s.#definitions) {
        test(definition.description, async () => {
          const value = await s.#setup();
          const more = (await definition.fn(value)) ?? [];

          const [first, ...rest] = more;

          if (first) {
            await first();
          }

          for (let i = 0; i < rest.length; i++) {
            const result = await s.#setup();
            const newMore = (await definition.fn(
              result
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

  test(description: string, fn: TestFn<T>): this {
    this.#definitions.push({ description, fn });
    return this;
  }
}
