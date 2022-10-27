// @vitest-environment jsdom

import { useReactive, useReactiveSetup } from "@starbeam/react";
import {
  Cell,
  FormulaFn,
  LIFETIME,
  PolledFormulaFn,
} from "@starbeam/universal";
import {
  html,
  react,
  testStrictAndLoose,
} from "@starbeam-workspace/react-test-utils";
import { useState } from "react";
import { describe, expect } from "vitest";

const INITIAL_ID = 0;
const INITIAL_COUNT = 0;
const INCREMENT = 1;

let nextId = INITIAL_ID;

describe("useReactive", () => {
  testStrictAndLoose<void, number>(
    "useReactiveSetup with useReactive",
    async (mode, test) => {
      const result = await test
        .expectHTML((value) => `<p>${value}</p><button>++</button>`)
        .render((state) => {
          const { cell, increment } = useReactiveSetup(() => {
            const count = Cell(INITIAL_COUNT, `#${++nextId}`);

            function incrementCell(): void {
              count.set(count.current + INCREMENT);
            }

            return () => ({ cell: count, increment: incrementCell });
          }, "first useReactiveSetup");

          return useReactive(() => {
            state.value(cell.current);

            return react.fragment(
              html.p(String(cell.current)),
              html.button({ onClick: increment }, "++")
            );
          }, `JSX#${nextId}`);
        });

      expect(result.value).toBe(INITIAL_COUNT);

      await result.find("button").fire.click();

      expect(result.value).toBe(INITIAL_COUNT + INCREMENT);
    }
  );

  testStrictAndLoose<void, { counter: number }>(
    "useSetup with Formula + useReactive",
    async (mode, test) => {
      let testId = 0;
      const result = await test
        .expectHTML(({ counter }) => `<p>${counter}</p>`)
        .expectStable()
        .render((state) => {
          ++testId;
          const counter = useReactiveSetup(() => {
            const cell = Cell(INITIAL_COUNT, `#${testId}`);
            return FormulaFn(
              () => ({ counter: cell.current }),
              `inner #${testId}`
            );
          }, `#${testId}`);

          state.value(counter);

          return react.fragment(html.p(String(counter.counter)));
        });

      expect(result.value).toEqual({ counter: 0 });

      // make sure the value is stable if the formula hasn't changed
      await result.rerender();
    }
  );

  testStrictAndLoose<void, { counter: number }>(
    "useSetup with Formula + useReactive",
    async (mode, test) => {
      nextId = INITIAL_ID;
      const result = await test
        .expectHTML(({ counter }) => `<p>${counter}</p><button>++</button>`)
        .expectStable()
        .render((state) => {
          ++nextId;
          const { formula, increment } = useReactiveSetup(() => {
            const cell = Cell(INITIAL_COUNT, `#${nextId}`);
            return () => ({
              formula: FormulaFn(
                () => ({ counter: cell.current }),
                `inner #${nextId}`
              ),
              increment: () => {
                cell.update((count) => count + INCREMENT);
              },
            });
          }, `#${nextId}`);

          const counter = useReactive(formula);

          state.value(counter);

          return react.fragment(
            html.p(String(formula().counter)),
            html.button({ onClick: increment }, "++")
          );
        });

      await result.find("button").fire.click();

      expect(result.value).toEqual({ counter: 1 });

      // make sure the value is stable if the formula hasn't changed
      await result.rerender();
    }
  );

  testStrictAndLoose<void, { starbeam: number; react: number }>(
    "useReactive",
    async (mode, test) => {
      const result = await test
        .expectStable()
        .expectHTML(
          (count) =>
            `<p>${count.starbeam} + ${count.react} = ${
              count.starbeam + count.react
            }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
        )

        .render((state) => {
          const [reactCount, setReactCount] = useState(INITIAL_COUNT);

          const { count, increment } = useReactiveSetup(() => {
            const cell = Cell(INITIAL_COUNT);

            function incrementCount(): void {
              cell.update((i) => i + INCREMENT);
            }

            return () => ({
              count: cell,
              increment: incrementCount,
            });
          });

          return useReactive(() => {
            state.value({ starbeam: count.current, react: reactCount });

            return react.fragment(
              html.p(
                count.current,
                " + ",
                reactCount,
                " = ",
                count.current + reactCount
              ),
              html.label(
                html.span("Increment"),
                html.button({ onClick: increment }, "++Starbeam++"),
                html.button(
                  {
                    onClick: () => {
                      setReactCount((i) => i + INCREMENT);
                    },
                  },
                  "++React++"
                )
              )
            );
          });
        });

      expect(result.value).toEqual({ starbeam: 0, react: 0 });
      await result.findByText("++Starbeam++").fire.click();

      expect(result.value).toEqual({ starbeam: 1, react: 0 });

      await result.findByText("++React++").fire.click();
      expect(result.value).toEqual({ starbeam: 1, react: 1 });
    }
  );

  testStrictAndLoose<void, { starbeam: number; react: number }>(
    "everything in useSetup",
    async (mode, test) => {
      const result = await test
        .expectStable()
        .expectHTML(
          (count) =>
            `<p>${count.starbeam} + ${count.react} = ${
              count.starbeam + count.react
            }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
        )

        .render((state) => {
          return useReactiveSetup(() => {
            const cell = Cell(INITIAL_COUNT);

            function increment(): void {
              cell.update((i) => i + INCREMENT);
            }

            return PolledFormulaFn(() => {
              const [reactCount, setReactCount] = useState(INITIAL_COUNT);

              state.value({ starbeam: cell.current, react: reactCount });

              return react.fragment(
                html.p(
                  cell.current,
                  " + ",
                  reactCount,
                  " = ",
                  cell.current + reactCount
                ),
                html.label(
                  html.span("Increment"),
                  html.button({ onClick: increment }, "++Starbeam++"),
                  html.button(
                    {
                      onClick: () => {
                        setReactCount((count) => count + INCREMENT);
                      },
                    },
                    "++React++"
                  )
                )
              );
            });
          });
        });

      expect(result.value).toEqual({ starbeam: 0, react: 0 });
      await result.findByText("++Starbeam++").fire.click();

      expect(result.value).toEqual({ starbeam: 1, react: 0 });

      await result.findByText("++React++").fire.click();
      expect(result.value).toEqual({ starbeam: 1, react: 1 });
    }
  );
});

// eslint-disable-next-line unused-imports/no-unused-vars
class TestResource {
  static #nextId = INITIAL_ID;

  static create(): TestResource {
    return new TestResource(TestResource.#nextId++);
  }

  #id: number;
  #active = true;

  constructor(id: number) {
    this.#id = id;

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
