// @vitest-environment jsdom

import { setup, useReactive } from "@starbeam/react";
import { CachedFormula, Cell, Formula } from "@starbeam/universal";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "@starbeam-workspace/test-utils";
import { useState } from "react";

const INITIAL_ID = 0;
const INITIAL_COUNT = 0;
const INCREMENT = 1;

let nextId = INITIAL_ID;

describe("useReactive", () => {
  testReact<void, number>("useSetup with useReactive", async (root) => {
    const result = root
      .expectHTML((value) => `<p>${value}</p><button>++</button>`)
      .render((state) => {
        const { cell, increment } = setup(() => {
          const count = Cell(INITIAL_COUNT, `#${++nextId}`);

          function incrementCell(): void {
            count.set(count.current + INCREMENT);
          }

          return { cell: count, increment: incrementCell };
        });

        return useReactive(() => {
          state.value(cell.current);

          return react.fragment(
            html.p(String(cell.current)),
            html.button({ onClick: increment }, "++")
          );
        }, [cell]);
      });

    expect(result.value).toBe(INITIAL_COUNT);

    await result.find("button").fire.click();

    expect(result.value).toBe(INITIAL_COUNT + INCREMENT);
  });

  // testReact<void, number>("useCell with useReactive", async (root) => {
  //   const result = root
  //     .expectHTML((value) => `<p>${value}</p><button>++</button>`)
  //     .render((state) => {
  //       const counter = setupCell(0);

  //       return useReactive(() => {
  //         state.value(counter.current);

  //         return react.fragment(
  //           html.p(String(counter.current)),
  //           html.button({ onClick: () => counter.current++ }, "++")
  //         );
  //       }, []);
  //     });

  //   expect(result.value).toBe(INITIAL_COUNT);

  //   await result.find("button").fire.click();

  //   expect(result.value).toBe(INITIAL_COUNT + INCREMENT);
  // });

  testReact<void, { counter: number }>(
    "setup with Formula + useReactive",
    async (test) => {
      let testId = 0;
      const result = test
        .expectHTML(({ counter }) => `<p>${counter}</p>`)
        .expectStable()
        .render((state) => {
          ++testId;
          const { counter } = useReactive(() => {
            const cell = Cell(INITIAL_COUNT, `#${testId}`);
            return CachedFormula(
              () => ({ counter: cell.current }),
              `inner #${testId}`
            );
          }, []);

          state.value({ counter });

          return react.fragment(html.p(String(counter)));
        });

      expect(result.value).toEqual({ counter: 0 });

      // make sure the value is stable if the formula hasn't changed
      await result.rerender();
    }
  );

  testReact<void, { counter: number }>(
    "useSetup returning a custom reactive object + useReactive",
    async (root) => {
      nextId = INITIAL_ID;
      const result = root
        .expectHTML(({ counter }) => `<p>${counter}</p><button>++</button>`)
        .expectStable()
        .render((state) => {
          ++nextId;
          const { formula, increment } = setup(() => {
            const cell = Cell(INITIAL_COUNT, `#${nextId}`);
            return {
              formula: CachedFormula(
                () => ({ counter: cell.current }),
                `inner #${nextId}`
              ),
              increment: () => {
                cell.update((count) => count + INCREMENT);
              },
            };
          });

          return useReactive(() => {
            state.value(formula());

            return react.fragment(
              html.p(String(formula().counter)),
              html.button({ onClick: increment }, "++")
            );
          }, []);
        });

      await result.find("button").fire.click();

      expect(result.value).toEqual({ counter: 1 });

      // make sure the value is stable if the formula hasn't changed
      await result.rerender();
    }
  );

  testReact<void, { starbeam: number; react: number }>(
    "useReactive",
    async (root) => {
      const result = root
        .expectStable()
        .expectHTML(
          (count) =>
            `<p>${count.starbeam} + ${count.react} = ${
              count.starbeam + count.react
            }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
        )

        .render((state) => {
          const [reactCount, setReactCount] = useState(INITIAL_COUNT);

          const { count, increment } = setup(() => {
            const cell = Cell(INITIAL_COUNT);

            function incrementCount(): void {
              cell.update((i) => i + INCREMENT);
            }

            return {
              count: cell,
              increment: incrementCount,
            };
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
          }, [count, reactCount]);
        });

      expect(result.value).toEqual({ starbeam: 0, react: 0 });
      await result.findByText("++Starbeam++").fire.click();

      expect(result.value).toEqual({ starbeam: 1, react: 0 });

      await result.findByText("++React++").fire.click();
      expect(result.value).toEqual({ starbeam: 1, react: 1 });
    }
  );

  testReact<void, { starbeam: number; react: number }>(
    "useReactiveSetup",
    async (root) => {
      const result = root
        .expectStable()
        .expectHTML(
          (count) =>
            `<p>${count.starbeam} + ${count.react} = ${
              count.starbeam + count.react
            }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
        )

        .render((state) => {
          return useReactive(() => {
            const cell = Cell(INITIAL_COUNT);

            function increment(): void {
              cell.update((i) => i + INCREMENT);
            }

            return Formula(() => {
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
          }, []);
        });

      expect(result.value).toEqual({ starbeam: 0, react: 0 });
      await result.findByText("++Starbeam++").fire.click();

      expect(result.value).toEqual({ starbeam: 1, react: 0 });

      await result.findByText("++React++").fire.click();
      expect(result.value).toEqual({ starbeam: 1, react: 1 });
    }
  );
});
