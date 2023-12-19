import { UNINITIALIZED } from "@starbeam/shared";
import type {
  AnyFunction,
  RecordedEvents,
} from "@starbeam-workspace/test-utils";
import { entryPoint, expect } from "@starbeam-workspace/test-utils";
import type { RenderResult } from "@testing-library/vue";
import { nextTick } from "vue";

import type { AndExpect, ExpectedHTML, ExpectOptions } from "./testing.js";
import { EMPTY } from "./testing.js";

export class RenderedApp<T = void> {
  static create = <T>(
    result: RenderResult,
    events: RecordedEvents,
    output?: ExpectedHTML<T>,
  ): AndExpect<T> => {
    const rendered = new RenderedApp(result, events, output);
    return rendered.#expect(() => {}, RenderedApp.create);
  };

  readonly #result: RenderResult;
  readonly #events: RecordedEvents;
  readonly #output: ExpectedHTML<T> | undefined;
  #lastArgs: T | UNINITIALIZED = UNINITIALIZED;

  constructor(
    result: RenderResult,
    events: RecordedEvents,
    output?: ExpectedHTML<T>,
  ) {
    this.#result = result;
    this.#events = events;
    this.#output = output;
  }

  /**
   * @returns The raw {@linkcode RenderResult} from `@testing-library/vue`.
   */
  get raw(): RenderResult {
    return this.#result;
  }

  #expect(
    block: () => void | Promise<void>,
    caller: AnyFunction,
    overrides: { output?: string | EMPTY; events?: string[] } = {},
  ): AndExpect<T> {
    return {
      andExpect: async (args) => {
        // separate entry point due to async
        // @todo make async entry points work
        await entryPoint(block, { entryFn: caller });

        return entryPoint(
          () => {
            this.expect(
              args === "unchanged"
                ? (overrides as ExpectOptions<T>)
                : { ...overrides, ...args },
            );
            return this;
          },
          { entryFn: caller },
        );
      },

      andAssert: async () => {
        // separate entry point due to async
        // @todo make async entry points work
        await entryPoint(block, { entryFn: caller });

        return entryPoint(
          () => {
            this.expect((overrides as ExpectOptions<T>) ?? "unchanged");
            return this;
          },
          { entryFn: caller },
        );
      },
    };
  }

  /**
   * Rerender the application and specify expectation.
   *
   * {@see AndExpect}
   */
  readonly rerender = (): AndExpect<T> => {
    return this.#expect(async () => this.#result.rerender({}), this.rerender);
  };

  readonly flush = (): AndExpect<T> => {
    return this.#expect(nextTick, this.flush);
  };

  readonly click = (name?: string | undefined): AndExpect<T> => {
    return this.#expect(async () => {
      const options = name ? { name } : {};
      (await this.#result.findByRole("button", options)).click();
    }, this.click);
  };

  readonly unmount = (): AndExpect<T> => {
    return this.#expect(() => void this.#result.unmount(), this.unmount, {
      output: EMPTY,
    });
  };

  expect(specifiedOptions: ExpectOptions<T>): void {
    const options = (
      specifiedOptions === "unchanged" ? {} : specifiedOptions
    ) as Exclude<typeof specifiedOptions, "unchanged">;

    if (this.#output && options.output === undefined) {
      if (this.#lastArgs !== UNINITIALIZED) {
        options.output = this.#lastArgs;
      } else {
        throw Error(
          `Missing expected output in rendered app (and no previous output was specified)`,
        );
      }
    }

    const events = options.events ?? [];

    this.#events.expectEvents(events);

    if (options.output === EMPTY) {
      expect(this.#result.container.innerHTML).toBe("");
    } else if (this.#output) {
      this.#output.expect(this.#result.container, options.output as T);
      this.#lastArgs = options.output as T;
    } else {
      expect(this.#result.container.innerHTML).toBe(options.output);
    }
  }
}
